import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Search, Truck, Archive, ArchiveRestore, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const fournisseurSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  tel: z.string().optional(),
  email: z
    .string()
    .email("Email invalide")
    .optional()
    .or(z.literal("")),
  adresse: z.string().optional(),
  notes: z.string().optional(),
});

type FournisseurFormData = z.infer<typeof fournisseurSchema>;

interface Fournisseur extends FournisseurFormData {
  id: number;
  is_active: boolean;
  created_at: string;
}

export default function FournisseursModule() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // Show 6 items per page
  const { toast } = useToast();

  // ⚠️ backend tourne sur 3001
  const API_URL = "http://127.0.0.1:3001";

  const form = useForm<FournisseurFormData>({
    resolver: zodResolver(fournisseurSchema),
    defaultValues: {
      nom: "",
      tel: "",
      email: "",
      adresse: "",
      notes: "",
    },
  });

  // Charger les fournisseurs
  useEffect(() => {
    fetchFournisseurs();
  }, [showArchived]);

  // Fix for pagination bug - reset to first page when filtered list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fournisseurs.length, showArchived]);

  const fetchFournisseurs = async () => {
    try {
      const url = showArchived 
        ? `${API_URL}/fournisseurs?archived=true`
        : `${API_URL}/fournisseurs?archived=false`;
      
      const res = await fetch(url);
      const data = await res.json();
      setFournisseurs(data);
    } catch {
      toast({ 
        title: "Erreur de chargement", 
        description: "Impossible de charger les fournisseurs",
        variant: "destructive" 
      });
    }
  };

  const filteredFournisseurs = fournisseurs.filter((fournisseur) =>
    fournisseur.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fournisseur.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fournisseur.tel?.includes(searchTerm)
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredFournisseurs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFournisseurs.slice(indexOfFirstItem, indexOfLastItem);

  const onSubmit = async (data: FournisseurFormData) => {
    try {
      if (editingFournisseur) {
        const res = await fetch(`${API_URL}/fournisseurs/${editingFournisseur.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const updated = await res.json();
        setFournisseurs((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f))
        );
        toast({ title: "Fournisseur modifié" });
      } else {
        const res = await fetch(`${API_URL}/fournisseurs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const newFournisseur = await res.json();
        setFournisseurs((prev) => [...prev, newFournisseur]);
        toast({ title: "Fournisseur ajouté" });
      }
      handleCloseDialog();
    } catch {
      toast({ 
        title: "Erreur lors de l'enregistrement", 
        variant: "destructive" 
      });
    }
  };

  const handleEdit = (fournisseur: Fournisseur) => {
    setEditingFournisseur(fournisseur);
    form.reset(fournisseur);
    setIsDialogOpen(true);
  };

  const handleArchive = async (fournisseur: Fournisseur, archive: boolean) => {
    try {
      const res = await fetch(`${API_URL}/fournisseurs/${fournisseur.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: archive }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
        return;
      }

      // Update local state immediately for instant UI update
      if (!showArchived && archive) {
        // If we're viewing active suppliers and archiving one, remove it from the list
        setFournisseurs(fournisseurs.filter(f => f.id !== fournisseur.id));
      } else if (showArchived && !archive) {
        // If we're viewing archived suppliers and restoring one, remove it from the list
        setFournisseurs(fournisseurs.filter(f => f.id !== fournisseur.id));
      } else {
        // Otherwise, just update the archived status
        setFournisseurs(prev =>
          prev.map(f => f.id === fournisseur.id ? { ...f, is_active: !archive } : f)
        );
      }

      toast({ title: data.message });
      setIsArchiveDialogOpen(false);
      setSelectedFournisseur(null);

    } catch {
      toast({ title: "Erreur de connexion", description: "Impossible de contacter le serveur", variant: "destructive" });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFournisseur(null);
    form.reset({ nom: "", tel: "", email: "", adresse: "", notes: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            Fournisseurs
          </h2>
          <p className="text-muted-foreground mt-1">
            {showArchived ? "Fournisseurs archivés" : "Fournisseurs actifs"}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingFournisseur(null)}>
              <Plus className="mr-2 h-4 w-4" /> Nouveau fournisseur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingFournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom du fournisseur" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="01 23 45 67 89" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="contact@fournisseur.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adresse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Adresse complète du fournisseur"
                          rows={3}
                          {...field}
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
                        <Textarea
                          placeholder="Notes internes sur le fournisseur"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Annuler
                  </Button>
                  <Button type="submit">{editingFournisseur ? "Modifier" : "Créer"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Archive Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedFournisseur?.is_active ? "Archiver le fournisseur" : "Restaurer le fournisseur"}
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir {selectedFournisseur?.is_active ? "archiver" : "restaurer"} le fournisseur {selectedFournisseur?.nom} ?
              {selectedFournisseur?.is_active && " Le fournisseur n'apparaîtra plus dans la liste des fournisseurs actifs."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => selectedFournisseur && handleArchive(selectedFournisseur, selectedFournisseur.is_active)}
            >
              {selectedFournisseur?.is_active ? "Archiver" : "Restaurer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Liste des fournisseurs ({filteredFournisseurs.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <Label htmlFor="show-archived" className="text-sm whitespace-nowrap">
                  Voir les fournisseurs archivés
                </Label>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un fournisseur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
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
                <TableHead>Contact</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((fournisseur) => (
                <TableRow key={fournisseur.id} className={!fournisseur.is_active ? "opacity-70 bg-muted/30" : ""}>
                  <TableCell className="font-medium">{fournisseur.nom}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {fournisseur.tel && <div className="text-sm">{fournisseur.tel}</div>}
                      {fournisseur.email && (
                        <div className="text-sm text-muted-foreground">
                          {fournisseur.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {fournisseur.adresse && (
                      <div className="text-sm max-w-xs truncate" title={fournisseur.adresse}>
                        {fournisseur.adresse}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {fournisseur.notes && (
                      <div className="text-sm max-w-xs truncate" title={fournisseur.notes}>
                        {fournisseur.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={fournisseur.is_active ? "default" : "outline"}>
                      {fournisseur.is_active ? "Actif" : "Archivé"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {fournisseur.created_at
                      ? new Date(fournisseur.created_at).toLocaleDateString("fr-FR")
                      : ""}
                  </TableCell>
                  <TableCell className="text-right">
  <div className="flex items-center justify-end space-x-2">
    <TooltipProvider>
      {/* Bouton Éditer */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(fournisseur)}
            disabled={!fournisseur.is_active}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{fournisseur.is_active ? "Modifier le fournisseur" : "Fournisseur archivé – modification désactivée"}</p>
        </TooltipContent>
      </Tooltip>

      {/* Bouton Archiver / Restaurer */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={fournisseur.is_active ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}
            onClick={() => {
              setSelectedFournisseur(fournisseur);
              setIsArchiveDialogOpen(true);
            }}
          >
            {fournisseur.is_active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{fournisseur.is_active ? "Archiver le fournisseur" : "Restaurer le fournisseur"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</TableCell>

                </TableRow>
              ))}
              {currentItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucun fournisseur trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Controls - Show only if more than 6 items */}
          {filteredFournisseurs.length > 6 && (
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
    </div>
  );
}