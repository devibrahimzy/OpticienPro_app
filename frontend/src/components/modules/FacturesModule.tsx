import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Download, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import html2pdf from "html2pdf.js";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Facture {
  id: number;
  numero: string;
  vente_id: number;
  client_nom: string;
  date_facture: string;
  total_ttc: number;
  statut: string;
}

interface FacturesModuleProps {
  userId: number;
  username: string;
  role: string;
}

export const FacturesModule = ({ userId, username, role }: FacturesModuleProps) => {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
  const [factureDetails, setFactureDetails] = useState<any>(null);
  const [factureLignes, setFactureLignes] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [showAnnule, setShowAnnule] = useState(false);
  
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Fetch all invoices
  useEffect(() => {
    fetchFactures();
  }, [userId, role, showAnnule]);

  const fetchFactures = async () => {
    try {
      // Pass user_id and role as query parameters
      const url = `http://127.0.0.1:3001/factures?user_id=${userId}&role=${role}`;
      const response = await fetch(url);
      const data = await response.json();
      setFactures(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setLoading(false);
    }
  };

  // Fix for pagination bug - reset to first page when filtered list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, factures.length, showAnnule]);

  // Fetch invoice details when preview is opened
  useEffect(() => {
    if (selectedFacture) {
      const fetchFactureDetails = async () => {
        try {
          const [detailsResponse, lignesResponse] = await Promise.all([
            fetch(`http://127.0.0.1:3001/factures/${selectedFacture.id}`),
            fetch(`http://127.0.0.1:3001/factures/${selectedFacture.id}/lignes`)
          ]);
          
          const details = await detailsResponse.json();
          const lignes = await lignesResponse.json();
          
          setFactureDetails(details);
          setFactureLignes(lignes);
        } catch (error) {
          console.error('Error fetching invoice details:', error);
        }
      };

      fetchFactureDetails();
    }
  }, [selectedFacture]);

  const handlePreview = (facture: Facture) => {
    setSelectedFacture(facture);
    setIsPreviewOpen(true);
  };

  const handleDownloadPDF = () => {
    if (!invoiceRef.current) return;
    
    const element = invoiceRef.current;
    const opt = {
      margin: 10,
      filename: `facture-${selectedFacture?.numero}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const filteredFactures = factures.filter(facture =>
    (facture.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facture.client_nom.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (showAnnule ? facture.statut === 'annulée' : facture.statut !== 'annulée')
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredFactures.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFactures.slice(indexOfFirstItem, indexOfLastItem);

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "brouillon":
        return <Badge variant="secondary">Brouillon</Badge>;
      case "generee":
        return <Badge variant="secondary" className="text-primary">Générée</Badge>;
      case "envoyee":
        return <Badge variant="secondary" className="text-accent">Envoyée</Badge>;
      case "payee":
        return <Badge variant="secondary" className="text-success">Payée</Badge>;
      case "partiellement payée":
        return <Badge variant="secondary" className="text-amber-600">Partiellement payée</Badge>;
      case "en attente":
        return <Badge variant="secondary" className="text-accent">En attente</Badge>;
      case "annulée":
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const getTotalsByMonth = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthFactures = factures.filter(f => {
      const factureDate = new Date(f.date_facture);
      return factureDate.getMonth() === currentMonth && 
             factureDate.getFullYear() === currentYear &&
             f.statut !== 'annulée';
    });

    const totalFactures = currentMonthFactures.length;
    const totalMontant = currentMonthFactures.reduce((sum, f) => sum + f.total_ttc, 0);

    return { totalFactures, totalMontant };
  };

  const { totalFactures, totalMontant } = getTotalsByMonth();

  if (loading) {
    return <div>Chargement des factures...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Consultation des Factures
          </h2>
          <p className="text-muted-foreground">Consultez vos factures existantes</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-card shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Factures ce mois</p>
                <p className="text-2xl font-bold text-foreground">{totalFactures}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-foreground">{totalMontant.toFixed(0)} MAD</p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
  <div className="flex flex-col sm:flex-row gap-4 sm:justify-end sm:items-center">
    {/* Toggle */}
    <div className="flex items-center space-x-2">
      <Switch
        id="show-annule"
        checked={showAnnule}
        onCheckedChange={setShowAnnule}
      />
      <Label htmlFor="show-annule" className="text-sm whitespace-nowrap">
        Voir les factures annulées
      </Label>
    </div>

    {/* Search */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Rechercher une facture..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 w-full sm:w-64"
      />
    </div>
  </div>
</CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
  {currentItems.length > 0 ? (
    currentItems.map((facture) => (
      <TableRow key={facture.id}>
        <TableCell className="font-medium">{facture.numero}</TableCell>
        <TableCell>{facture.client_nom}</TableCell>
        <TableCell>
          {new Date(facture.date_facture).toLocaleDateString("fr-FR")}
        </TableCell>
        <TableCell className="font-medium">
          {facture.total_ttc.toFixed(2)} MAD
        </TableCell>
        <TableCell>{getStatutBadge(facture.statut)}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-2 rounded hover:bg-gray-100"
                    onClick={() => handlePreview(facture)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Voir les détails</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </TableCell>
      </TableRow>
    ))
  ) : (
    <TableRow>
      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
        Aucune facture trouvée
      </TableCell>
    </TableRow>
  )}
</TableBody>

          </Table>
          
          {/* Pagination Controls - Show only if more than 6 items */}
          {filteredFactures.length > 6 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <span className="text-sm font-medium">
                Page {currentPage} sur {totalPages}
              </span>

              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Détails de la facture - {selectedFacture?.numero}
            </DialogTitle>
          </DialogHeader>
          
          {selectedFacture && factureDetails && (
            <div className="space-y-4">
              <div className="flex justify-end gap-2 mb-4">
                <button
                  className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2"
                  onClick={handleDownloadPDF}
                >
                  <Download className="h-4 w-4" />
                  Télécharger PDF
                </button>
              </div>
              
              <div ref={invoiceRef} className="p-6 bg-white text-black space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-primary">OPTIQUE PRO</h1>
                    <p className="text-sm text-gray-600">
                      123 Rue de la Vision<br/>
                      75001 Paris<br/>
                      Tél: 01 23 45 67 89
                    </p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold">FACTURE</h2>
                    <p className="text-lg font-semibold">{selectedFacture.numero}</p>
                    <p className="text-sm text-gray-600">
                      Date: {new Date(selectedFacture.date_facture).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-sm text-gray-600">
                      Statut: {selectedFacture.statut}
                    </p>
                  </div>
                </div>

                {/* Client Info */}
                <div className="border border-gray-300 p-4 rounded">
                  <h3 className="font-semibold mb-2">Facturer à:</h3>
                  <p className="font-medium">{factureDetails.client_nom}</p>
                  <p className="text-sm text-gray-600">
                    {factureDetails.client_adresse}<br/>
                    Tél: {factureDetails.client_tel}
                  </p>
                </div>

                {/* Items */}
                <div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 font-semibold">Description</th>
                        <th className="text-center py-2 font-semibold">Qté</th>
                        <th className="text-right py-2 font-semibold">Prix unitaire</th>
                        <th className="text-right py-2 font-semibold">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {factureLignes.map((ligne, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="py-2">
                            {ligne.produit_type === 'monture' ? 'Monture' : 'Verre'} {ligne.produit_ref}
                            {ligne.produit_details && ` - ${ligne.produit_details}`}
                          </td>
                          <td className="text-center py-2">{ligne.qte}</td>
                          <td className="text-right py-2">{ligne.pu_ht.toFixed(2)} MAD</td>
                          <td className="text-right py-2">{ligne.total_ligne.toFixed(2)} MAD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Sous-total HT:</span>
                      <span>{factureDetails.total_ht?.toFixed(2) || '0.00'} MAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TVA (20%):</span>
                      <span>{(factureDetails.total_ttc - factureDetails.total_ht)?.toFixed(2) || '0.00'} MAD</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total TTC:</span>
                      <span>{factureDetails.total_ttc?.toFixed(2) || '0.00'} MAD</span>
                    </div>
                    {factureDetails.total_mutuelle > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Prise en charge mutuelle:</span>
                          <span className="text-green-600">-{factureDetails.total_mutuelle.toFixed(2)} MAD</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Reste à charge:</span>
                          <span>{factureDetails.total_client.toFixed(2)} MAD</span>
                        </div>
                      </>
                    )}
                    {factureDetails.avance > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Avance:</span>
                        <span className="text-green-600">- {factureDetails.avance.toFixed(2)} MAD</span>
                      </div>
                    )}
                    {factureDetails.reste > 0 && (
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Reste à payer:</span>
                        <span>{factureDetails.reste.toFixed(2)} MAD</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-600 border-t pt-4">
                  <p>Merci de votre confiance !</p>
                  <p>Conditions de paiement: 30 jours net</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};