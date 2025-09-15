import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, ShoppingCart, CreditCard, History, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

import { VenteForm } from './VenteForm';
import { 
  VentesModuleProps, 
  Vente, 
  Client, 
  Mutuelle, 
  Produit, 
  Reglement, 
  Facture,
  VenteFormData,
  VenteLigneFormData
} from './types';
import { 
  fetchVentesData, 
  fetchVenteDetails, 
  saveVente, 
  deleteVente, 
  processPayment,
  calculateTotals,
  calculateMutuelleCoverage,
  calculateLigneTotal
} from './utils';

export const VentesModule = ({ userId, username, role }: VentesModuleProps) => {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [mutuelles, setMutuelles] = useState<Mutuelle[]>([]);
  const [montures, setMontures] = useState<Produit[]>([]);
  const [verres, setVerres] = useState<Produit[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVente, setEditingVente] = useState<Vente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [venteToDelete, setVenteToDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);
  const [paiements, setPaiements] = useState<Reglement[]>([]);
  const [facture, setFacture] = useState<Facture | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("espèces");
  const [paymentRef, setPaymentRef] = useState("");
  const [showAnnule, setShowAnnule] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const { toast: uiToast } = useToast();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(7);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchVentesData(userId, role);
      
      setVentes(data.ventes);
      setClients(data.clients);
      setMutuelles(data.mutuelles);
      setMontures(data.montures);
      setVerres(data.verres);
    } catch (error) {
      console.error("Error fetching data:", error);
      uiToast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data: VenteFormData, lignesTemp: VenteLigneFormData[]) => {
    const errors: string[] = [];
    
    if (data.client_id === 0) errors.push("Veuillez sélectionner un client");
    
    if (lignesTemp.length === 0) {
      errors.push("Veuillez ajouter au moins une ligne de produit");
    } else {
      if (lignesTemp.some(l => l.produit_id === 0)) {
        errors.push("Tous les produits doivent être sélectionnés");
      }
      
      lignesTemp.forEach(ligne => {
        if (ligne.produit_id > 0) {
          const produits = [...montures, ...verres];
          const produit = produits.find(p => p.id === ligne.produit_id);
          
          if (produit && (produit.stock || 0) < ligne.qte) {
            errors.push(`Stock insuffisant pour ${produit.ref}. Disponible: ${produit.stock}, Demandé: ${ligne.qte}`);
          }
        }
      });
    }
    
    const { totalTTC } = calculateTotals(lignesTemp);
    const mutuelleCoverage = calculateMutuelleCoverage(totalTTC, data.mutuelle_id, mutuelles);
    const clientTotal = totalTTC - mutuelleCoverage;
    
    if (data.avance > clientTotal) {
      errors.push("L'avance ne peut pas dépasser le montant total à charge du client");
    }
    
    setFormErrors(errors);
    return errors.length === 0;
  };

  const onSubmit = async (data: VenteFormData, lignesTemp: VenteLigneFormData[]) => {
  if (!validateForm(data, lignesTemp)) {
    uiToast({
      title: "Erreur de validation",
      description: "Veuillez corriger les erreurs dans le formulaire",
      variant: "destructive",
    });
    return;
  }

  try {
    const { totalHT, totalTTC } = calculateTotals(lignesTemp);
    const totalMutuelle = calculateMutuelleCoverage(totalTTC, data.mutuelle_id, mutuelles);
    const totalClient = totalTTC - totalMutuelle;
    const reste = totalClient - data.avance;

    const lignesWithTotals = lignesTemp.map(ligne => ({
      ...ligne,
      total_ligne: calculateLigneTotal(ligne)
    }));

    const venteData = { 
      client_id: data.client_id, 
      user_id: userId,
      mutuelle_id: data.mutuelle_id || null, 
      avance: data.avance,
      total_ht: totalHT,
      total_ttc: totalTTC,
      total_mutuelle: totalMutuelle,
      total_client: totalClient,
      reste: reste,
      lignes: lignesWithTotals 
    };

    const result = await saveVente(venteData, editingVente);
    
    // Show invoice information if created
    if (result.facture) {
      uiToast({
        title: "Succès",
        description: `Vente créée avec succès. Facture ${result.facture.numero} générée.`,
      });
    } else {
      uiToast({
        title: "Succès",
        description: editingVente ? "Vente modifiée avec succès" : "Vente créée avec succès",
      });
    }
    
    fetchData();
    handleCloseDialog();
  } catch (error: any) {
    console.error("Error saving vente:", error);
    uiToast({
      title: "Erreur",
      description: error.message || "Erreur lors de la sauvegarde",
      variant: "destructive",
    });
  }
};



  const handleDeleteVente = async (venteId: number) => {
    try {
      await deleteVente(venteId);
      
      uiToast({
        title: "Succès",
        description: "Vente annulée avec succès",
      });
      fetchData();
      setDeleteDialogOpen(false);
      setVenteToDelete(null);
    } catch (error: any) {
      console.error("Error deleting vente:", error);
      uiToast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVente(null);
    setFormErrors([]);
  };

  const handleEdit = (vente: Vente) => {
    if (vente.statut === "finalisée") {
      uiToast({
        title: "Erreur",
        description: "Impossible de modifier une vente finalisée",
        variant: "destructive",
      });
      return;
    }
    
    setEditingVente(vente);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (venteId: number) => { 
    const vente = ventes.find(v => v.id === venteId);
    if (vente && vente.statut === "finalisée") {
      uiToast({
        title: "Erreur",
        description: "Impossible de supprimer une vente finalisée",
        variant: "destructive",
      });
      return;
    }
    
    setVenteToDelete(venteId); 
    setDeleteDialogOpen(true); 
  };

  const openPaymentDialog = async (vente: Vente) => {
    setSelectedVente(vente);
    setPaymentAmount(vente.reste);
    setPaymentDialogOpen(true);
    
    try {
      const { paiements: paiementsData, facture: factureData } = await fetchVenteDetails(vente.id);
      setPaiements(paiementsData);
      setFacture(factureData);
    } catch (error) {
      console.error("Error fetching vente details:", error);
      uiToast({
        title: "Erreur",
        description: "Impossible de charger les détails de la vente",
        variant: "destructive",
      });
    }
  };

  const handlePayment = async () => {
    if (!selectedVente || paymentAmount <= 0) return;

    try {
      const result = await processPayment(selectedVente.id, {
        montant: paymentAmount,
        mode: paymentMode,
        ref_piece: paymentRef,
      });

      uiToast({
        title: "Succès",
        description: result.message || "Paiement enregistré avec succès",
      });

      fetchData();
      setPaymentDialogOpen(false);
      setPaymentAmount(0);
      setPaymentRef("");
    } catch (error: any) {
      console.error("Payment error:", error);
      uiToast({
        title: "Erreur",
        description: error.message || "Erreur lors du paiement",
        variant: "destructive",
      });
    }
  };

  const openHistoryDialog = async (vente: Vente) => {
    setSelectedVente(vente);
    
    try {
      const { paiements: paiementsData, facture: factureData } = await fetchVenteDetails(vente.id);
      setPaiements(paiementsData);
      setFacture(factureData);
    } catch (error) {
      console.error("Error fetching vente details:", error);
      uiToast({
        title: "Erreur",
        description: "Impossible de charger les détails de la vente",
        variant: "destructive",
      });
    }
    
    setHistoryDialogOpen(true);
  };

  const filteredVentes = ventes.filter(v => {
    const matchesSearch = v.client_nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.id.toString().includes(searchTerm);
    
    if (showAnnule) {
      return matchesSearch && v.statut === "annulée";
    }
    
    return matchesSearch && v.statut !== "annulée";
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredVentes.length / itemsPerPage);
  const currentVentes = filteredVentes.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "ouverte": 
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Ouverte</Badge>;
      case "finalisée": 
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Finalisée</Badge>;
      case "annulée": 
        return <Badge variant="destructive">Annulée</Badge>;
      default: 
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement des ventes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-primary" />
            Gestion des Ventes
          </h2>
          <p className="text-muted-foreground">
            Connecté en tant que <span className="font-medium">{username}</span> ({role})
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Vente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVente ? "Modifier la vente" : "Nouvelle vente"}
              </DialogTitle>
            </DialogHeader>
            
            <VenteForm
              clients={clients}
              mutuelles={mutuelles}
              montures={montures}
              verres={verres}
              editingVente={editingVente}
              onSubmit={onSubmit}
              onCancel={handleCloseDialog}
              formErrors={formErrors}
              onToast={(title, description, variant) => uiToast({ title, description, variant })}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Historique des paiements</DialogTitle>
            <DialogDescription>
              Historique des paiements pour la vente #{selectedVente?.id.toString().padStart(4, '0')}
              {facture && (
                <span className="ml-2 font-semibold">
                  - Facture: {facture.numero}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {facture && (
            <div className="mb-4 p-3 bg-background border border-blue-200 rounded-md">
              <h4 className="font-medium text-blue-800">Information de facturation</h4>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="font-medium">Numéro:</span> {facture.numero}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {new Date(facture.date_facture).toLocaleDateString('fr-FR')}
                </div>
                <div>
                  <span className="font-medium">Total TTC:</span> {facture.total_ttc.toFixed(2)} MAD
                </div>
                <div>
                  <span className="font-medium">Statut:</span> 
                  <Badge variant={facture.statut === 'payée' ? 'default' : 'secondary'} className="ml-2">
                    {facture.statut}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          
          {paiements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode de paiement</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Référence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paiements.map(paiement => (
                  <TableRow key={paiement.id}>
                    <TableCell>{new Date(paiement.date_reglement).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{paiement.mode}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{paiement.montant.toFixed(2)} MAD</TableCell>
                    <TableCell>{paiement.ref_piece || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun historique de paiement pour cette vente</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="bg-card shadow-md border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des ventes ({filteredVentes.length})</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une vente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-annule"
                  checked={showAnnule}
                  onCheckedChange={setShowAnnule}
                />
                <Label htmlFor="show-annule">Afficher les ventes annulées</Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVentes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {showAnnule 
                  ? "Aucune vente annulée trouvée" 
                  : "Aucune vente trouvée"
                }
              </p>
              {!showAnnule && (
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  Créer votre première vente
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Vente</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total TTC</TableHead>
                    <TableHead>Mutuelle</TableHead>
                    <TableHead>Reste à payer</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentVentes.map((vente) => (
                    <TableRow 
                      key={vente.id} 
                      className={vente.statut === "annulée" ? "opacity-80 bg-muted/50" : ""}
                    >
                      <TableCell className="font-medium">#{vente.id.toString().padStart(4, '0')}</TableCell>
                      <TableCell>{vente.client_nom}</TableCell>
                      <TableCell>{new Date(vente.date_vente).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="font-medium">{vente.total_ttc.toFixed(2)} MAD</TableCell>
                      <TableCell>
                        {vente.mutuelle_nom ? (
                          <Badge variant="outline">{vente.mutuelle_nom}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Aucune</span>
                        )}
                      </TableCell>
                      <TableCell className={vente.reste > 0 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
                        {vente.reste > 0 ? "MAD" : "MAD"} {vente.reste.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatutBadge(vente.statut)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {vente.statut !== "annulée" ? (
                            <>
                              {vente.statut !== "finalisée" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(vente)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Modifier la vente</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {vente.reste > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openPaymentDialog(vente)}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        <CreditCard className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Enregistrer un paiement</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {vente.statut === "finalisée" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openHistoryDialog(vente)}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        <History className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Voir l'historique des paiements</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {vente.statut !== "finalisée" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteClick(vente.id)}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Annuler la vente</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">Vente annulée</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <span className="text-sm font-medium">
                    Page {page} sur {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="rounded-full"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Paiement de la vente #{selectedVente?.id.toString().padStart(4, '0')}</DialogTitle>
          </DialogHeader>
          
          {selectedVente && selectedVente.statut !== "annulée" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Total à payer</label>
                  <div className="font-bold text-lg">{selectedVente.total_client.toFixed(2)} MAD</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Reste à payer</label>
                  <div className="font-bold text-lg text-amber-600">{selectedVente.reste.toFixed(2)} MAD</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Montant du paiement</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedVente.reste}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Mode de paiement</label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="espèces">Espèces</SelectItem>
                    <SelectItem value="carte">Carte bancaire</SelectItem>
                    <SelectItem value="chèque">Chèque</SelectItem>
                    <SelectItem value="virement">Virement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Référence (optionnel)</label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="N° de chèque, référence virement, etc."
                />
              </div>

              {paiements.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Historique des paiements</h4>
                  <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                    {paiements.map((paiement) => (
                      <div key={paiement.id} className="flex justify-between text-sm py-1 border-b last:border-b-0">
                        <span>{new Date(paiement.date_reglement).toLocaleDateString()}</span>
                        <span className="font-medium">{paiement.montant.toFixed(2)} MAD</span>
                        <span className="text-muted-foreground">{paiement.mode}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handlePayment}
                  disabled={paymentAmount <= 0 || paymentAmount > selectedVente.reste}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Enregistrer le paiement
                </Button>
              </div>
            </div>
          )}

          {selectedVente && selectedVente.statut === "annulée" && (
            <div className="text-center py-4 text-muted-foreground">
              <p>Cette vente a été annulée et ne peut pas être payée.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir annuler cette vente ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera la vente et restaurera le stock des produits. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => venteToDelete && handleDeleteVente(venteToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Annuler la vente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};