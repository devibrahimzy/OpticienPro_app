// ClientPurchaseHistory.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, EyeOff, Eye as EyeIcon, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SaleLine {
  produit_type: string;
  produit_id: number;
  qte: number;
  pu_ht: number;
  remise: number;
  total_ligne: number;
  produit_ref: string;
  produit_marque: string;
  produit_details: string;
  produit_spec: string;
}

interface Sale {
  id: number;
  date_vente: string;
  total_ttc: number;
  total_client: number;
  total_mutuelle: number;
  statut: string;
  user_name: string;
  mutuelle: {
    nom: string;
    couverture_type: string;
    couverture_valeur: number;
    plafond: number;
  } | null;
  lignes: SaleLine[];
}

interface Client {
  id: number;
  nom: string;
  prenom: string;
  archived: boolean;
  created_at: string;
}

interface ClientPurchaseHistoryProps {
  client: Client;
}

export const ClientPurchaseHistory = ({ client }: ClientPurchaseHistoryProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [clientSales, setClientSales] = useState<Sale[]>([]);
  const [expandedSales, setExpandedSales] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const API_URL = "http://127.0.0.1:3001";

  const fetchClientSales = async (clientId: number) => {
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}/sales-detailed`);
      const data = await res.json();
      setClientSales(data);
    } catch (err) {
      console.error("Error fetching client sales:", err);
      setClientSales([]);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des achats",
        variant: "destructive",
      });
    }
  };

  const toggleSaleExpansion = (saleId: number) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedSales(newExpanded);
  };

  const handleViewHistory = async () => {
    setIsDialogOpen(true);
    await fetchClientSales(client.id);
    setExpandedSales(new Set()); // Reset expanded state
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      {/* Tooltip-wrapped history button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewHistory}
              disabled={client.archived}
            >
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Voir l'historique d'achats</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historique d&apos;achats détaillé</DialogTitle>
            <DialogDescription>
              Historique complet des achats pour {client.prenom} {client.nom}
            </DialogDescription>
          </DialogHeader>

          {clientSales.length > 0 ? (
            <div className="space-y-4">
              {clientSales.map((sale) => (
                <Collapsible
                  key={sale.id}
                  open={expandedSales.has(sale.id)}
                  onOpenChange={() => toggleSaleExpansion(sale.id)}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    {/* Left info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <h4 className="font-semibold">Vente #00{sale.id}</h4>
                        <Badge
                          variant={
                            sale.statut === "annulée"
                              ? "destructive"
                              : sale.statut === "finalisée"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {sale.statut}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(sale.date_vente)} par {sale.user_name}
                      </p>
                    </div>

                    {/* Totals */}
                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-emerald-700">
                        {sale.total_ttc} MAD
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Client:</span>{" "}
                        {sale.total_client} MAD
                      </div>
                      {sale.mutuelle && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Mutuelle:</span>{" "}
                          {sale.total_mutuelle} MAD
                        </div>
                      )}
                    </div>

                    {/* Toggle button */}
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-4 bg-[rgb(15,97,62)] hover:bg-[rgb(15,97,62)] text-white"
                      >
                        {expandedSales.has(sale.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                        <span className="sr-only">Détails</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    {sale.mutuelle && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                        <h5 className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Couverture mutuelle
                        </h5>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Mutuelle:</span>
                            <span className="font-medium ml-2">{sale.mutuelle.nom}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Couverture:</span>
                            <span className="font-medium ml-2">
                              {sale.mutuelle.couverture_type === "%"
                                ? `${sale.mutuelle.couverture_valeur}%`
                                : `${sale.mutuelle.couverture_valeur} MAD`}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Plafond:</span>
                            <span className="font-medium ml-2">
                              {sale.mutuelle.plafond} MAD
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Montant pris en charge:</span>
                            <span className="font-medium ml-2">
                              {sale.total_mutuelle} MAD
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Articles achetés</h5>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Référence</TableHead>
                            <TableHead>Produit</TableHead>
                            <TableHead>Détails</TableHead>
                            <TableHead>Quantité</TableHead>
                            <TableHead>Prix unitaire</TableHead>
                            <TableHead>Remise</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sale.lignes.map((ligne, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{ligne.produit_ref}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {ligne.produit_type === "monture" ? "Monture" : "Verre"}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {ligne.produit_marque}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {ligne.produit_details}
                                  {ligne.produit_spec && (
                                    <div className="text-muted-foreground">
                                      {ligne.produit_spec}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{ligne.qte}</TableCell>
                              <TableCell>{ligne.pu_ht} MAD</TableCell>
                              <TableCell>
                                {ligne.remise > 0 ? `${ligne.remise}%` : "-"}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {ligne.total_ligne} MAD
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-4 flex justify-between items-center border-t pt-4">
                      <div className="text-sm text-muted-foreground">
                        {sale.lignes.length} article{sale.lignes.length > 1 ? "s" : ""}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{sale.total_ttc} MAD</div>
                        {sale.mutuelle && (
                          <div className="text-sm text-muted-foreground">
                            Dont mutuelle: {sale.total_mutuelle} MAD
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun historique d&apos;achat pour ce client</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
