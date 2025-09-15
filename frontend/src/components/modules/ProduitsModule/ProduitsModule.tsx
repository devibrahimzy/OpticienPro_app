import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Glasses } from "lucide-react";
import axios from 'axios';
import { MontureModule } from "./MontureModule";
import { VerreModule } from "./VerreModule";
import { StockModule } from "./StockModule";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const demandStockSchema = z.object({
  produit_type: z.enum(["monture", "verre"]),
  produit_id: z.number().min(1, "Sélectionnez un produit"),
  quantite: z.number().min(1, "La quantité doit être supérieure à 0"),
  fournisseur_id: z.number().min(1, "Sélectionnez un fournisseur"),
  prix_unitaire: z.number().min(0, "Le prix unitaire doit être positif"),
});

type DemandStockFormData = z.infer<typeof demandStockSchema>;

export interface Monture {
  id: number;
  ref: string;
  marque: string;
  matiere?: string;
  couleur?: string;
  prix_vente: number;
  prix_achat?: number;
  stock?: number;
  created_at: string;
}

export interface Verre {
  id: number;
  ref: string;
  type_verre: string;
  indice: number;
  diametre: number;
  traitement?: string;
  prix_vente: number;
  prix_achat?: number;
  stock?: number;

  created_at: string;
}

export interface DemandStock {
  id: number;
  produit_type: "monture" | "verre";
  produit_id: number;
  quantite: number;
  fournisseur_id?: number;
  prix_unitaire: number;
  statut: "en attente" | "commande" | "livré" | "annulee";
  date_demande: string;
  date_livraison?: string; // Only this delivery date field
}

export interface Fournisseur {
  id: number;
  nom: string;
}

export const ProduitsModule = () => {
  const [montures, setMontures] = useState<Monture[]>([]);
  const [verres, setVerres] = useState<Verre[]>([]);
  const [demandStock, setDemandStock] = useState<DemandStock[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDemandDialogOpen, setIsDemandDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{type: "monture" | "verre", id: number} | null>(null);
  const [editingDemand, setEditingDemand] = useState<DemandStock | null>(null);

  const demandForm = useForm<DemandStockFormData>({
    resolver: zodResolver(demandStockSchema),
    defaultValues: {
      produit_type: "monture" as const,
      produit_id: 0,
      quantite: 1,
      fournisseur_id: undefined,
      prix_unitaire: 0,
    },
  });

  const produit_type = demandForm.watch("produit_type");

  // Fetch data from backend
  const fetchData = async () => {
    try {
      const [monturesRes, verresRes, demandsRes, fournisseursRes] = await Promise.all([
        axios.get('http://127.0.0.1:3001/montures-with-stock'),
        axios.get('http://127.0.0.1:3001/verres-with-stock'),
        axios.get('http://127.0.0.1:3001/stock-demands'),
        axios.get('http://127.0.0.1:3001/fournisseurs?archived=false'),
      ]);
      setMontures(monturesRes.data);
      setVerres(verresRes.data);
      
      // Sort demands to show newest first
      const sortedDemands = demandsRes.data.sort((a: DemandStock, b: DemandStock) => 
        new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime()
      );
      setDemandStock(sortedDemands);
      
      setFournisseurs(fournisseursRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh products function
  const refreshProducts = async () => {
    try {
      const [monturesRes, verresRes] = await Promise.all([
        axios.get('http://127.0.0.1:3001/montures-with-stock'),
        axios.get('http://127.0.0.1:3001/verres-with-stock')
      ]);
      setMontures(monturesRes.data);
      setVerres(verresRes.data);
    } catch (error) {
      console.error('Error refreshing products:', error);
    }
  };

  // Auto-set form values when selecting a product
  useEffect(() => {
    if (selectedProduct) {
      demandForm.setValue("produit_type", selectedProduct.type);
      demandForm.setValue("produit_id", selectedProduct.id);
      
      let product: Monture | Verre | undefined;
      if (selectedProduct.type === "monture") {
        product = montures.find((m) => m.id === selectedProduct.id);
      } else {
        product = verres.find((v) => v.id === selectedProduct.id);
      }

      if (product) {
        demandForm.setValue("prix_unitaire", product.prix_achat || 0);
      }
    }
  }, [selectedProduct, montures, verres, demandForm]);

  const handleDemandForMonture = (id: number) => {
    setSelectedProduct({ type: "monture", id });
    setIsDemandDialogOpen(true);
    setEditingDemand(null);
  };

  const handleDemandForVerre = (id: number) => {
    setSelectedProduct({ type: "verre", id });
    setIsDemandDialogOpen(true);
    setEditingDemand(null);
  };

  const onSubmitDemand = async (data: DemandStockFormData) => {
  try {
    if (editingDemand) {
      await axios.put(`http://127.0.0.1:3001/stock-demands/${editingDemand.id}`, {
        ...data,
        statut: editingDemand.statut,
        date_livraison: editingDemand.date_livraison // Only keep date_livraison
      });
      setDemandStock(demandStock.map(d => d.id === editingDemand.id ? { ...d, ...data } : d));
    } else {
      const response = await axios.post('http://127.0.0.1:3001/stock-demands', data);
      const newDemand: DemandStock = {
        ...data,
        id: response.data.id,
        statut: "commande" as const,
        date_demande: new Date().toISOString().split('T')[0],
        date_livraison: undefined // Only date_livraison, no date_livraison_prevue
      };
      
      // Add new demand at the beginning of the list
      setDemandStock([newDemand, ...demandStock]);
    }
    handleCloseDemandDialog();
  } catch (error) {
    console.error('Error saving stock demand:', error);
  }
};

  const handleCloseDemandDialog = () => {
    setIsDemandDialogOpen(false);
    setEditingDemand(null);
    setSelectedProduct(null);
    demandForm.reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Glasses className="h-8 w-8 text-primary" />
            Gestion des Produits
          </h2>
          <p className="text-muted-foreground">Gérez vos montures et verres</p>
        </div>
      </div>

      {/* Stock Demand Dialog */}
      <Dialog open={isDemandDialogOpen} onOpenChange={setIsDemandDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDemand ? "Modifier la demande" : "Nouvelle demande de stock"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...demandForm}>
            <form onSubmit={demandForm.handleSubmit(onSubmitDemand)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Produit type */}
                <FormField
                  control={demandForm.control}
                  name="produit_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de produit *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monture">Monture</SelectItem>
                            <SelectItem value="verre">Verre</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Produit */}
                <FormField
                  control={demandForm.control}
                  name="produit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produit *</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un produit" />
                          </SelectTrigger>
                          <SelectContent>
                            {produit_type === "monture" 
                              ? montures.map((monture) => (
                                  <SelectItem key={monture.id} value={monture.id.toString()}>
                                    {monture.ref} - {monture.marque}
                                  </SelectItem>
                                ))
                              : verres.map((verre) => (
                                  <SelectItem key={verre.id} value={verre.id.toString()}>
                                    {verre.ref} - {verre.type_verre}
                                  </SelectItem>
                                ))
                            }
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Quantité */}
                <FormField
                  control={demandForm.control}
                  name="quantite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Prix unitaire */}
                <FormField
                  control={demandForm.control}
                  name="prix_unitaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix unitaire (MAD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Fournisseur */}
                <FormField
                  control={demandForm.control}
                  name="fournisseur_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fournisseur *</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value ? field.value.toString() : ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un fournisseur" />
                          </SelectTrigger>
                          <SelectContent>
                            {fournisseurs.map((fournisseur) => (
                              <SelectItem key={fournisseur.id} value={fournisseur.id.toString()}>
                                {fournisseur.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDemandDialog}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingDemand ? "Modifier" : "Créer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="montures" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="montures">Montures ({montures.length})</TabsTrigger>
          <TabsTrigger value="verres">Verres ({verres.length})</TabsTrigger>
          <TabsTrigger value="demandes">Demandes Stock ({demandStock.length})</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="montures">
          <MontureModule
            montures={montures}
            setMontures={setMontures}
            fournisseurs={fournisseurs}
            searchTerm={searchTerm}
            onDemandStock={handleDemandForMonture}
          />
        </TabsContent>

        <TabsContent value="verres">
          <VerreModule
            verres={verres}
            setVerres={setVerres}
            fournisseurs={fournisseurs}
            searchTerm={searchTerm}
            onDemandStock={handleDemandForVerre}
          />
        </TabsContent>

        <TabsContent value="demandes">
          <StockModule
            demandStock={demandStock}
            setDemandStock={setDemandStock}
            montures={montures}
            verres={verres}
            fournisseurs={fournisseurs}
            searchTerm={searchTerm}
            onEditDemand={(demand) => {
              setEditingDemand(demand);
              setIsDemandDialogOpen(true);
            }}
            refreshProducts={refreshProducts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};