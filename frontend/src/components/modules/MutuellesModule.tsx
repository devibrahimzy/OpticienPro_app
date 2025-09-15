import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Search, CreditCard, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const API_URL = "http://127.0.0.1:3001/mutuelles";

const mutuelleSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  couverture_type: z.enum(["%", "montant"]),
  couverture_valeur: z.number().min(0, "La valeur de couverture doit être positive"),
  plafond: z.number().min(0, "Le plafond doit être positif"),
  notes: z.string().optional(),
});

type MutuelleFormData = z.infer<typeof mutuelleSchema>;

interface Mutuelle extends MutuelleFormData {
  id: number;
  is_active: number; // 1 = active, 0 = archived
}

export const MutuellesModule = () => {
  const [mutuelles, setMutuelles] = useState<Mutuelle[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMutuelle, setEditingMutuelle] = useState<Mutuelle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [facture, setFacture] = useState<number>(0);
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // Show 6 items per page

  const form = useForm<MutuelleFormData>({
    resolver: zodResolver(mutuelleSchema),
    defaultValues: {
      nom: "",
      couverture_type: "%",
      couverture_valeur: 0,
      plafond: 0,
      notes: "",
    },
  });

  // Fetch mutuelles based on showArchived state
  useEffect(() => {
    // Fetch only active mutuelles when showArchived is false
    // Fetch only archived mutuelles when showArchived is true
    const isActiveParam = showArchived ? "0" : "1";
    const url = `${API_URL}?is_active=${isActiveParam}`;
    
    fetch(url)
      .then((res) => res.json())
      .then((data) => setMutuelles(data))
      .catch(console.error);
  }, [showArchived]);

  // Fix for pagination bug - reset to first page when filtered list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, mutuelles.length, showArchived]);

  const onSubmit = async (data: MutuelleFormData) => {
    try {
      if (editingMutuelle) {
        // Update
        const res = await fetch(`${API_URL}/${editingMutuelle.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          setMutuelles(mutuelles.map((m) => (m.id === updated.id ? updated : m)));
        }
      } else {
        // Create - ensure we show active mutuelles after creation
        setShowArchived(false);
        
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const created = await res.json();
          // Force a refetch to ensure we get the latest data with proper is_active status
          const refreshUrl = `${API_URL}?is_active=1`;
          fetch(refreshUrl)
            .then((res) => res.json())
            .then((data) => setMutuelles(data))
            .catch(console.error);
        }
      }
      handleCloseDialog();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMutuelle(null);
    form.reset();
  };

  const handleEdit = (mutuelle: Mutuelle) => {
    setEditingMutuelle(mutuelle);
    form.reset(mutuelle);
    setIsDialogOpen(true);
  };

  const handleDelete = async (mutuelleId: number) => {
    try {
      const res = await fetch(`${API_URL}/${mutuelleId}`, { method: "DELETE" });
      if (res.ok) {
        // Check if we're on the last page with only one item
        const filteredMutuelles = mutuelles.filter(m => m.id !== mutuelleId);
        const totalPages = Math.ceil(filteredMutuelles.length / itemsPerPage);
        
        // If current page is beyond the new total pages, go back to the last available page
        if (currentPage > totalPages) {
          setCurrentPage(totalPages > 0 ? totalPages : 1);
        }
        
        setMutuelles(filteredMutuelles);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReactivate = async (mutuelleId: number) => {
    try {
      const res = await fetch(`${API_URL}/${mutuelleId}/reactivate`, { method: "PATCH" });
      if (res.ok) {
        // Check if we're on the last page with only one item
        const filteredMutuelles = mutuelles.filter(m => m.id !== mutuelleId);
        const totalPages = Math.ceil(filteredMutuelles.length / itemsPerPage);
        
        // If current page is beyond the new total pages, go back to the last available page
        if (currentPage > totalPages) {
          setCurrentPage(totalPages > 0 ? totalPages : 1);
        }
        
        // Remove the reactivated mutuelle from the archived list
        setMutuelles(filteredMutuelles);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMutuelles = mutuelles.filter((mutuelle) =>
    mutuelle.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredMutuelles.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMutuelles.slice(indexOfFirstItem, indexOfLastItem);

  const formatCouverture = (type: string, valeur: number) =>
    type === "%" ? `${valeur}%` : `€${valeur.toFixed(0)}`;

  const calculateCouverture = (mutuelle: Mutuelle, montantTotal: number) => {
    let couverture =
      mutuelle.couverture_type === "%"
        ? montantTotal * (mutuelle.couverture_valeur / 100)
        : mutuelle.couverture_valeur;
    return Math.min(couverture, mutuelle.plafond);
  };

  return (
    <div className="space-y-6">
      {/* Header + Dialog */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Gestion des Mutuelles
          </h2>
          <p className="text-muted-foreground">Configurez les prises en charge des mutuelles</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Mutuelle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMutuelle ? "Modifier la mutuelle" : "Nouvelle mutuelle"}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la mutuelle *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="couverture_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de couverture *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="%">Pourcentage (%)</SelectItem>
                              <SelectItem value="montant">Montant fixe (€)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="couverture_valeur"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Valeur de couverture *
                          {form.watch("couverture_type") === "%" ? " (%)" : " (€)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step={form.watch("couverture_type") === "%" ? "1" : "0.01"}
                            max={form.watch("couverture_type") === "%" ? "100" : undefined}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="plafond"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plafond annuel (€) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingMutuelle ? "Modifier" : "Créer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des mutuelles */}
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Liste des mutuelles ({filteredMutuelles.length}) - 
              {showArchived ? " Archivées" : " Actives"}
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <Label htmlFor="show-archived" className="text-sm whitespace-nowrap">
                  Voir les mutuelles archivées
                </Label>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une mutuelle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Plafond</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((mutuelle) => (
                <TableRow key={mutuelle.id}>
                  <TableCell className="font-medium">{mutuelle.nom}</TableCell>
                  <TableCell>
                    <Badge
                      variant={mutuelle.couverture_type === "%" ? "default" : "secondary"}
                    >
                      {mutuelle.couverture_type === "%"
                        ? "Pourcentage"
                        : "Montant fixe"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCouverture(
                      mutuelle.couverture_type,
                      mutuelle.couverture_valeur
                    )}
                  </TableCell>
                  <TableCell>€{mutuelle.plafond.toFixed(0)}</TableCell>
                  <TableCell>
                    {mutuelle.notes && (
                      <Badge variant="outline" className="text-xs">
                        {mutuelle.notes.length > 20
                          ? `${mutuelle.notes.substring(0, 20)}...`
                          : mutuelle.notes}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {mutuelle.is_active === 1 ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Archivée</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
  <div className="flex justify-end gap-2">
    <TooltipProvider>
      {/* Éditer */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(mutuelle)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Modifier la mutuelle</p>
        </TooltipContent>
      </Tooltip>

      {/* Supprimer / Archiver */}
      {mutuelle.is_active === 1 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(mutuelle.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Archiver la mutuelle</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReactivate(mutuelle.id)}
              className="text-success hover:text-success"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Restaurer la mutuelle</p>
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  </div>
</TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination Controls - Show only if more than 6 items */}
          {filteredMutuelles.length > 6 && (
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

      {/* Simulateur dynamique - Only show for active mutuelles */}
      {!showArchived && (
        <Card className="bg-gradient-card shadow-md border-0">
          <CardHeader>
            <CardTitle>Simulateur de prise en charge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="montant-simulation">Montant de la facture (€)</Label>
                <Input
                  id="montant-simulation"
                  type="number"
                  placeholder="0.00"
                  className="mt-1"
                  value={facture}
                  onChange={(e) => setFacture(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Prises en charge estimées</Label>
                <div className="mt-2 space-y-2">
                  {mutuelles
                    .filter((m) => m.is_active === 1)
                    .map((mutuelle) => {
                      const priseEnCharge = calculateCouverture(mutuelle, facture);
                      const resteACharge = facture - priseEnCharge;
                      return (
                        <div
                          key={mutuelle.id}
                          className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                        >
                          <div>
                            <span className="font-medium">{mutuelle.nom}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              (
                              {formatCouverture(
                                mutuelle.couverture_type,
                                mutuelle.couverture_valeur
                              )}
                              )
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-success">
                              €{priseEnCharge.toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Reste à charge: €{resteACharge.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
            {mutuelles.filter((m) => m.is_active === 1).length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Aucune mutuelle active pour le simulateur
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};