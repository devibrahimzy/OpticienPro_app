import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, User, Package } from "lucide-react";
import { 
  VenteFormData, 
  VenteLigneFormData, 
  Client, 
  Mutuelle, 
  Produit, 
  Vente,
  venteSchema 
} from './types';
import { calculateLigneTotal, calculateTotals, calculateMutuelleCoverage } from './utils';

interface VenteFormProps {
  clients: Client[];
  mutuelles: Mutuelle[];
  montures: Produit[];
  verres: Produit[];
  editingVente: Vente | null;
  onSubmit: (data: VenteFormData, lignes: VenteLigneFormData[]) => void;
  onCancel: () => void;
  formErrors: string[];
  onToast: (title: string, description: string, variant?: "default" | "destructive") => void;
}

export const VenteForm: React.FC<VenteFormProps> = ({
  clients,
  mutuelles,
  montures,
  verres,
  editingVente,
  onSubmit,
  onCancel,
  formErrors,
  onToast
}) => {
  const [lignesTemp, setLignesTemp] = React.useState<VenteLigneFormData[]>([
    { 
      produit_type: "monture", 
      produit_id: 0, 
      qte: 1, 
      pu_ht: 0, 
      remise: 0, 
      tva: 20,
      total_ligne: 0
    }
  ]);

  const form = useForm<VenteFormData>({
    resolver: zodResolver(venteSchema),
    defaultValues: { client_id: 0, mutuelle_id: undefined, avance: 0 },
  });

  React.useEffect(() => {
    if (editingVente) {
      setLignesTemp(editingVente.lignes.map(l => ({ 
        produit_type: l.produit_type as "monture" | "verre", 
        produit_id: l.produit_id, 
        qte: l.qte, 
        pu_ht: l.pu_ht, 
        remise: l.remise, 
        tva: l.tva,
        total_ligne: l.total_ligne
      })));
      
      form.reset({ 
        client_id: editingVente.client_id, 
        mutuelle_id: editingVente.mutuelle_id || undefined, 
        avance: editingVente.avance 
      });
    }
  }, [editingVente, form]);

  const addLigne = () => {
    setLignesTemp([...lignesTemp, { 
      produit_type: "monture", 
      produit_id: 0, 
      qte: 1, 
      pu_ht: 0, 
      remise: 0, 
      tva: 20,
      total_ligne: 0
    }]);
  };

  const removeLigne = (index: number) => {
    setLignesTemp(lignesTemp.filter((_, i) => i !== index));
  };

  const updateLigne = (index: number, field: keyof VenteLigneFormData, value: any) => {
    const newLignes = [...lignesTemp];
    newLignes[index] = { ...newLignes[index], [field]: value };
    
    if (['qte', 'pu_ht', 'remise', 'tva'].includes(field)) {
      newLignes[index].total_ligne = calculateLigneTotal(newLignes[index]);
    }
    
    if (field === "produit_id") {
      // CORRECTION: Utiliser la liste de produits appropriée selon le type
      const produits = newLignes[index].produit_type === "monture" ? montures : verres;
      const produit = produits.find(p => p.id === value);
      
      if (produit) {
        // CORRECTION: Vérifier que le prix est correctement extrait
        newLignes[index].pu_ht = produit.prix_vente;
        newLignes[index].total_ligne = calculateLigneTotal(newLignes[index]);
        
        if (newLignes[index].qte > (produit.stock || 0)) {
          onToast(
            "Stock insuffisant",
            `Stock insuffisant pour ${produit.nom || produit.ref}. Disponible: ${produit.stock}`,
            "destructive"
          );
        }
      }
    }
    
    // CORRECTION: Si le type de produit change, réinitialiser l'ID du produit et le prix
    if (field === "produit_type") {
      newLignes[index].produit_id = 0;
      newLignes[index].pu_ht = 0;
      newLignes[index].total_ligne = 0;
    }
    
    setLignesTemp(newLignes);
  };

  const handleSubmit = (data: VenteFormData) => {
    onSubmit(data, lignesTemp);
  };

  const { totalHT, totalTTC } = calculateTotals(lignesTemp);
  const mutuelleCoverage = calculateMutuelleCoverage(totalTTC, form.watch("mutuelle_id"), mutuelles);
  const clientTotal = totalTTC - mutuelleCoverage;
  const resteAPayer = Math.max(0, clientTotal - form.watch("avance"));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {formErrors.length > 0 && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
            <h4 className="text-destructive font-medium mb-2">Erreurs de validation:</h4>
            <ul className="list-disc list-inside">
              {formErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client *</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    value={field.value?.toString() || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {client.prenom} {client.nom}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="mutuelle_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mutuelle</FormLabel>
                <FormControl>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} 
                    value={field.value ? field.value.toString() : "none"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une mutuelle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune mutuelle</SelectItem>
                      {mutuelles.map((mutuelle) => (
                        <SelectItem key={mutuelle.id} value={mutuelle.id.toString()}>
                          {mutuelle.nom}
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

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Lignes de commandes</h3>
            <Button type="button" onClick={addLigne} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une ligne
            </Button>
          </div>

          <div className="space-y-4">
            {lignesTemp.map((ligne, index) => {
              const produits = ligne.produit_type === "monture" ? montures : verres;
              const selectedProduit = produits.find(p => p.id === ligne.produit_id);
              
              return (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-7 gap-4 items-end">
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={ligne.produit_type}
                        onValueChange={(value: "monture" | "verre") => updateLigne(index, 'produit_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monture">Monture</SelectItem>
                          <SelectItem value="verre">Verre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Produit</label>
                      <Select
                        value={ligne.produit_id.toString()}
                        onValueChange={(value) => updateLigne(index, 'produit_id', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {produits.map((produit) => (
                            <SelectItem 
                              key={produit.id} 
                              value={produit.id.toString()}
                              disabled={(produit.stock || 0) <= 0}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span>{produit.nom}</span>
                                <div className="flex items-center gap-1 text-xs">
                                  <Package className="h-3 w-3" />
                                  <span>{produit.stock || 0}</span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Qté</label>
                      <Input
                        type="number"
                        min="1"
                        max={selectedProduit?.stock || 1}
                        value={ligne.qte}
                        onChange={(e) => updateLigne(index, 'qte', parseInt(e.target.value) || 1)}
                      />
                      {selectedProduit && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Stock: {selectedProduit.stock}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium">PU HT (MAD)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ligne.pu_ht}
                        onChange={(e) => updateLigne(index, 'pu_ht', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Remise (%)</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={ligne.remise}
                        onChange={(e) => updateLigne(index, 'remise', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">TVA (%)</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={ligne.tva}
                        onChange={(e) => updateLigne(index, 'tva', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">
                        Total: {((ligne.qte * ligne.pu_ht * (1 - ligne.remise / 100)) * (1 + ligne.tva / 100)).toFixed(2)} MAD
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLigne(index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {selectedProduit && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Réf: {selectedProduit.ref} {selectedProduit.marque && `| Marque: ${selectedProduit.marque}`}
                      {selectedProduit.stock !== undefined && (
                        <span className={selectedProduit.stock < ligne.qte ? "text-destructive ml-2" : "text-green-600 ml-2"}>
                          Stock: {selectedProduit.stock}
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-6">
          <div>
            <FormField
              control={form.control}
              name="avance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avance versée (MAD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={clientTotal}
                      value={field.value}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex justify-between">
              <span>Total HT:</span>
              <span className="font-medium">{totalHT.toFixed(2)} MAD</span>
            </div>
            <div className="flex justify-between">
              <span>Total TTC:</span>
              <span className="font-medium">{totalTTC.toFixed(2)} MAD</span>
            </div>
            
            {form.watch('mutuelle_id') && (
              <div className="flex justify-between text-green-600">
                <span>Prise en charge mutuelle:</span>
                <span className="font-medium">{mutuelleCoverage.toFixed(2)} MAD</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span>Reste à charge client:</span>
              <span className="font-medium">{clientTotal.toFixed(2)} MAD</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between">
              <span>Avance versée:</span>
              <span className="font-medium">{form.watch('avance').toFixed(2)} MAD</span>
            </div>
            
            <div className="flex justify-between text-lg font-bold">
              <span>Reste à payer:</span>
              <span className={resteAPayer > 0 ? "text-amber-600" : "text-green-600"}>
                {resteAPayer.toFixed(2)} MAD
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit">
            {editingVente ? "Modifier" : "Créer"}
          </Button>
        </div>
      </form>
    </Form>
  );
};