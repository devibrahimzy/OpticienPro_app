import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ShoppingCart, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { DemandStock, Monture, Verre, Fournisseur } from "./ProduitsModule";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StockModuleProps {
  demandStock: DemandStock[];
  setDemandStock: (demandStock: DemandStock[]) => void;
  montures: Monture[];
  verres: Verre[];
  fournisseurs: Fournisseur[];
  searchTerm: string;
  onEditDemand: (demand: DemandStock) => void;
  refreshProducts: () => void;
}

export const StockModule = ({
  demandStock,
  setDemandStock,
  montures,
  verres,
  fournisseurs,
  searchTerm,
  onEditDemand,
  refreshProducts,
}: StockModuleProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // Show 6 items per page

  // Fix for pagination bug - reset to first page when filtered list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, demandStock.length]);

  const handleDelete = async (demandId: number) => {
    const currentDemand = demandStock.find((d) => d.id === demandId);
    if (!currentDemand || currentDemand.statut === "livré") {
      console.warn("❌ Cannot delete a demand that is already livré");
      return;
    }

    try {
      await axios.delete(`http://127.0.0.1:3001/stock-demands/${demandId}`);
      
      // Check if we're on the last page with only one item
      const filteredDemands = demandStock.filter(d => d.id !== demandId);
      const totalPages = Math.ceil(filteredDemands.length / itemsPerPage);
      
      // If current page is beyond the new total pages, go back to the last available page
      if (currentPage > totalPages) {
        setCurrentPage(totalPages > 0 ? totalPages : 1);
      }
      
      setDemandStock(filteredDemands);
    } catch (error) {
      console.error("Error deleting stock demand:", error);
    }
  };

  const updateStatus = async (demandId: number, newStatus: DemandStock["statut"]) => {
    const currentDemand = demandStock.find((d) => d.id === demandId);
    if (!currentDemand || currentDemand.statut === newStatus) return;

    try {
      const updateData: any = { statut: newStatus };
      if (newStatus === "livré") {
        updateData.date_livraison = new Date().toISOString().split("T")[0];
      }

      await axios.put(`http://127.0.0.1:3001/stock-demands/${demandId}/status`, updateData);

      const updatedDemands = demandStock.map((d) =>
        d.id === demandId ? { ...d, ...updateData } : d
      );

      setDemandStock(updatedDemands);

      if (newStatus === "livré") {
        refreshProducts();
      }
    } catch (error) {
      console.error("Error updating demand status:", error);
    }
  };

  const getStatusBadge = (statut: DemandStock["statut"]) => {
    switch (statut) {
      case "en attente":
        return (
          <Badge variant="secondary" className="text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />En attente
          </Badge>
        );
      case "commande":
        return (
          <Badge variant="secondary" className="text-blue-600">
            <ShoppingCart className="h-3 w-3 mr-1" />Commandé
          </Badge>
        );
      case "livré":
        return (
          <Badge variant="secondary" className="text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />Livré
          </Badge>
        );
      case "annulee":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />Annulé
          </Badge>
        );
      default:
        return <Badge variant="secondary">{statut}</Badge>;
    }
  };

  const getProductName = (produit_type: "monture" | "verre", produit_id: number) => {
    if (produit_type === "monture") {
      const monture = montures.find((m) => m.id === produit_id);
      return monture ? `${monture.ref} - ${monture.marque}` : "Produit non trouvé";
    } else {
      const verre = verres.find((v) => v.id === produit_id);
      return verre ? `${verre.ref} - ${verre.type_verre}` : "Produit non trouvé";
    }
  };

  const getFournisseurName = (fournisseurId?: number) => {
    if (!fournisseurId) return "Non spécifié";
    const fournisseur = fournisseurs.find((f) => f.id === fournisseurId);
    return fournisseur ? fournisseur.nom : "Non trouvé";
  };

  const filteredDemands = demandStock.filter((demand) => {
    const productName = getProductName(demand.produit_type, demand.produit_id);
    return (
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demand.statut.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Sort demands to show newest first (by date_demande)
  const sortedDemands = [...filteredDemands].sort((a, b) => 
    new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime()
  );

  // Pagination logic
  const totalPages = Math.ceil(sortedDemands.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedDemands.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <Card className="bg-gradient-card shadow-md border-0">
      <CardHeader>
        <CardTitle>Demandes de Stock ({filteredDemands.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedDemands.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? "Aucune demande de stock trouvée" : "Aucune demande de stock"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Aucune demande ne correspond à votre recherche. Essayez d'autres termes."
                : "Vous n'avez aucune demande de stock pour le moment."
              }
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Prix unitaire</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date demande</TableHead>
                  <TableHead>Date livraison</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((demand) => (
                  <TableRow key={demand.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="text-sm">
                          {getProductName(demand.produit_type, demand.produit_id)}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {demand.produit_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{demand.quantite}</TableCell>
                    <TableCell>€{demand.prix_unitaire.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{getFournisseurName(demand.fournisseur_id)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(demand.statut)}
                        {demand.statut === "en attente" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(demand.id, "commande")}
                              className="h-6 px-2 text-xs"
                            >
                              Commander
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(demand.id, "annulee")}
                              className="h-6 px-2 text-xs text-destructive"
                            >
                              Annuler
                            </Button>
                          </div>
                        )}
                        {demand.statut === "commande" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(demand.id, "livré")}
                              className="h-6 px-2 text-xs text-green-600"
                            >
                              Livré
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(demand.id, "annulee")}
                              className="h-6 px-2 text-xs text-destructive"
                            >
                              Annuler
                            </Button>
                          </div>
                        )}
                        {demand.statut === "annulee" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(demand.id, "commande")}
                              className="h-6 px-2 text-xs"
                            >
                              Réactiver
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{demand.date_demande}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{demand.date_livraison || "-"}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEditDemand(demand)}
                                disabled={demand.statut === "livré"}
                                className={
                                  demand.statut === "livré" ? "opacity-60 cursor-not-allowed" : ""
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Modifier la demande</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(demand.id)}
                                className={`text-destructive hover:text-destructive ${
                                  demand.statut === "livré" ? "opacity-60 cursor-not-allowed" : ""
                                }`}
                                disabled={demand.statut === "livré"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Supprimer la demande</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls - Show only if more than 6 items */}
            {sortedDemands.length > 6 && (
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
          </>
        )}
      </CardContent>
    </Card>
  );
};