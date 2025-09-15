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
import axios from 'axios';
import { Verre, Fournisseur } from "./ProduitsModule";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const verreSchema = z.object({
  ref: z.string().min(1, "La référence est requise"),
  type_verre: z.string().min(1, "Le type de verre est requis"),
  indice: z.number().min(1, "L'indice est requis"),
  diametre: z.number().min(1, "Le diamètre est requis"),
  traitement: z.string().optional(),
  prix_vente: z.number().min(0, "Le prix de vente doit être positif"),
  
});

type VerreFormData = z.infer<typeof verreSchema>;

interface VerreModuleProps {
  verres: Verre[];
  setVerres: (verres: Verre[]) => void;
  fournisseurs: Fournisseur[];
  searchTerm: string;
  onDemandStock: (id: number) => void;
}

export const VerreModule = ({
  verres,
  setVerres,
  fournisseurs,
  searchTerm,
  onDemandStock
}: VerreModuleProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Verre | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // Show 6 items per page

  const form = useForm<VerreFormData>({
    resolver: zodResolver(verreSchema),
    defaultValues: {
      ref: "",
      type_verre: "",
      indice: 0,
      diametre: 0,
      traitement: "",
      prix_vente: 0,
    
    },
  });

  // Fix for pagination bug - reset to first page when filtered list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, verres.length]);

  const onSubmit = async (data: VerreFormData) => {
    try {
      if (editingItem) {
        await axios.put(`http://127.0.0.1:3001/verres/${editingItem.id}`, data);
        setVerres(verres.map(v => v.id === editingItem.id ? { ...v, ...data } : v));
      } else {
        const response = await axios.post('http://127.0.0.1:3001/verres', data);
        setVerres([...verres, { ...data, id: response.data.id, created_at: new Date().toISOString().split('T')[0] }]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving verre:', error);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    form.reset();
  };

  const handleEdit = (verre: Verre) => {
    setEditingItem(verre);
    form.reset({
      ...verre,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (verreId: number) => {
    try {
      await axios.delete(`http://127.0.0.1:3001/verres/${verreId}`);
      
      // Check if we're on the last page with only one item
      const filteredVerres = verres.filter(v => v.id !== verreId);
      const totalPages = Math.ceil(filteredVerres.length / itemsPerPage);
      
      // If current page is beyond the new total pages, go back to the last available page
      if (currentPage > totalPages) {
        setCurrentPage(totalPages > 0 ? totalPages : 1);
      }
      
      setVerres(filteredVerres);
    } catch (error) {
      console.error('Error deleting verre:', error);
    }
  };

  const filteredVerres = verres.filter(verre =>
    verre.ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
    verre.type_verre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredVerres.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredVerres.slice(indexOfFirstItem, indexOfLastItem);

  const getStockBadge = (stock: number | undefined) => {
    if (stock === undefined || stock === 0) return <Badge variant="destructive">Rupture</Badge>;
    if (stock <= 5) return <Badge variant="secondary" className="text-yellow-600">Stock faible</Badge>;
    return <Badge variant="secondary" className="text-green-600">En stock</Badge>;
  };

  return (
    <>
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Verres ({filteredVerres.length})</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Verre
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Modifier le verre" : "Nouveau verre"}
                </DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      name="type_verre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de verre *</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Unifocal">Unifocal</SelectItem>
                                <SelectItem value="Bifocal">Bifocal</SelectItem>
                                <SelectItem value="Progressif">Progressif</SelectItem>
                                <SelectItem value="Mi-distance">Mi-distance</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="indice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Indice</FormLabel>
                          <FormControl>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <SelectTrigger>
                                <SelectValue placeholder="Indice" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="150">1.50</SelectItem>
                                <SelectItem value="156">1.56</SelectItem>
                                <SelectItem value="160">1.60</SelectItem>
                                <SelectItem value="167">1.67</SelectItem>
                                <SelectItem value="174">1.74</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="diametre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diamètre (mm)</FormLabel>
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
                    
                    <FormField
                      control={form.control}
                      name="traitement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Traitement</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Traitement" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Standard">Standard</SelectItem>
                                <SelectItem value="Durci">Durci</SelectItem>
                                <SelectItem value="Anti-reflet">Anti-reflet</SelectItem>
                                <SelectItem value="Photochromique">Photochromique</SelectItem>
                                <SelectItem value="Polarisant">Polarisant</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
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
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
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
                <TableHead>Type</TableHead>
                <TableHead>Indice/Diamètre</TableHead>
                <TableHead>Traitement</TableHead>
                <TableHead>Prix d'achat</TableHead>
                <TableHead>Prix de vente</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
  {currentItems.length > 0 ? (
    currentItems.map((verre) => (
      <TableRow key={verre.id}>
        <TableCell className="font-medium">{verre.ref}</TableCell>
        <TableCell>{verre.type_verre}</TableCell>
        <TableCell>
          <div className="space-y-1">
            <div className="text-sm">Indice {(verre.indice / 100).toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Ø {verre.diametre}mm</div>
          </div>
        </TableCell>
        <TableCell>{verre.traitement}</TableCell>
        <TableCell>{(verre.prix_achat || 0).toFixed(2)} MAD</TableCell>
        <TableCell>{(verre.prix_vente || 0).toFixed(2)} MAD</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span>{verre.stock || 0}</span>
            {getStockBadge(verre.stock)}
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
                    onClick={() => onDemandStock(verre.id)}
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
                    onClick={() => handleEdit(verre)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Modifier le verre</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(verre.id)}
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
        colSpan={8}
        className="text-center py-8 text-muted-foreground"
      >
        <div className="flex flex-col items-center justify-center">
          <ShoppingCart className="h-10 w-10 mb-2 opacity-50" />
          <span>Aucun verre trouvé</span>
        </div>
      </TableCell>
    </TableRow>
  )}
</TableBody>

          </Table>
          
          {/* Pagination Controls - Show only if more than 6 items */}
          {filteredVerres.length > 6 && (
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