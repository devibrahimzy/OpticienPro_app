import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ShoppingCart, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { Monture, Fournisseur } from "./ProduitsModule";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const montureSchema = z.object({
  ref: z.string().min(1, "La référence est requise"),
  marque: z.string().min(1, "La marque est requise"),
  matiere: z.string().optional(),
  couleur: z.string().optional(),
  prix_vente: z.number().min(0, "Le prix de vente doit être positif"),
 
});

type MontureFormData = z.infer<typeof montureSchema>;

interface MontureModuleProps {
  montures: Monture[];
  setMontures: (montures: Monture[]) => void;
  fournisseurs: Fournisseur[];
  searchTerm: string;
  onDemandStock: (id: number) => void;
}

export const MontureModule = ({
  montures,
  setMontures,
  fournisseurs,
  searchTerm,
  onDemandStock,
}: MontureModuleProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Monture | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // Show 6 items per page

  const form = useForm<MontureFormData>({
    resolver: zodResolver(montureSchema),
    defaultValues: {
      ref: "",
      marque: "",
      matiere: "",
      couleur: "",
      prix_vente: 0,
      
    },
  });

  // Fix for pagination bug - reset to first page when filtered list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, montures.length]);

  const onSubmit = async (data: MontureFormData) => {
    try {
      if (editingItem) {
        await axios.put(`http://127.0.0.1:3001/montures/${editingItem.id}`, data);
        setMontures(
          montures.map((m) => (m.id === editingItem.id ? { ...m, ...data } : m))
        );
      } else {
        const response = await axios.post("http://127.0.0.1:3001/montures", data);
        setMontures([
          ...montures,
          {
            ...data,
            id: response.data.id,
            created_at: new Date().toISOString().split("T")[0],
          },
        ]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving monture:", error);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    form.reset();
  };

  const handleEdit = (monture: Monture) => {
    setEditingItem(monture);
    form.reset({
      ...monture,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (montureId: number) => {
    try {
      await axios.delete(`http://127.0.0.1:3001/montures/${montureId}`);
      
      // Check if we're on the last page with only one item
      const filteredMontures = montures.filter((m) => m.id !== montureId);
      const totalPages = Math.ceil(filteredMontures.length / itemsPerPage);
      
      // If current page is beyond the new total pages, go back to the last available page
      if (currentPage > totalPages) {
        setCurrentPage(totalPages > 0 ? totalPages : 1);
      }
      
      setMontures(filteredMontures);
    } catch (error) {
      console.error("Error deleting monture:", error);
    }
  };

  const filteredMontures = montures.filter(
    (monture) =>
      monture.ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      monture.marque.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredMontures.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMontures.slice(indexOfFirstItem, indexOfLastItem);

  const getStockBadge = (stock: number | undefined) => {
    if (stock === undefined || stock === 0)
      return <Badge variant="destructive">Rupture</Badge>;
    if (stock <= 5)
      return <Badge variant="secondary" className="text-yellow-600">
        Stock faible
      </Badge>;
    return (
      <Badge variant="secondary" className="text-green-600">
        En stock
      </Badge>
    );
  };

  return (
    <>
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Montures ({filteredMontures.length})</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Monture
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Modifier la monture" : "Nouvelle monture"}
                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ref"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Référence *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="marque"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marque *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="matiere"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Matière</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une matière" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Acétate">Acétate</SelectItem>
                                <SelectItem value="Métal">Métal</SelectItem>
                                <SelectItem value="Plastique">
                                  Plastique
                                </SelectItem>
                                <SelectItem value="Titane">Titane</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="couleur"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couleur</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="prix_vente"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix de vente (MAD)</FormLabel>
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
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                    >
                      Annuler
                    </Button>
                    <Button type="submit">
                      {editingItem ? "Modifier" : "Créer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Matière/Couleur</TableHead>
                <TableHead>Prix d'achat</TableHead>
                <TableHead>Prix de vente</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
  {currentItems.length > 0 ? (
    currentItems.map((monture) => (
      <TableRow key={monture.id}>
        <TableCell className="font-medium">{monture.ref}</TableCell>
        <TableCell>{monture.marque}</TableCell>
        <TableCell>
          <div className="space-y-1">
            <div className="text-sm">{monture.matiere}</div>
            <div className="text-xs text-muted-foreground">
              {monture.couleur}
            </div>
          </div>
        </TableCell>
        <TableCell>
          {(monture.prix_achat || 0).toFixed(2)} MAD
        </TableCell>
        <TableCell>{(monture.prix_vente || 0).toFixed(2)} MAD</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span>{monture.stock || 0}</span>
            {getStockBadge(monture.stock)}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDemandStock(monture.id)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Demander du stock</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(monture)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Modifier la monture</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(monture.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Supprimer</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </TableCell>
      </TableRow>
    ))
  ) : (
    <TableRow>
      <TableCell
        colSpan={7}
        className="text-center py-6 text-muted-foreground"
      >
        Aucune monture trouvée
      </TableCell>
    </TableRow>
  )}
</TableBody>

          </Table>
          
          {/* Pagination Controls - Show only if more than 6 items */}
          {filteredMontures.length > 6 && (
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
    </>
  );
};