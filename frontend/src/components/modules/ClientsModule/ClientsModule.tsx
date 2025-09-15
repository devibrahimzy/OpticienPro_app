// ClientsModule.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, User, History, Archive, ArchiveRestore } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ClientPurchaseHistory } from "./ClientPurchaseHistory";

const clientSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  tel: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  adresse: z.string().optional(),
  date_naissance: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface Client extends ClientFormData {
  id: number;
  archived: boolean;
  created_at: string;
}

export const ClientsModule = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      tel: "",
      email: "",
      adresse: "",
      date_naissance: "",
      notes: "",
    },
  });

  const API_URL = "http://127.0.0.1:3001";

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const url = showArchived 
        ? `${API_URL}/clients?archived=true`
        : `${API_URL}/clients?archived=false`;
      
      const res = await fetch(url);
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error("Error fetching clients:", err);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des clients",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [showArchived]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
    form.reset();
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
      let res;
      if (editingClient) {
        // Edit client
        res = await fetch(`${API_URL}/clients/${editingClient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        // Add client
        res = await fetch(`${API_URL}/clients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }

      if (!res.ok) {
        throw new Error("Failed to save client");
      }

      const savedClient = await res.json();

      if (editingClient) {
        setClients(clients.map(c => (c.id === savedClient.id ? savedClient : c)));
        toast({
          title: "Succès",
          description: "Client modifié avec succès",
        });
      } else {
        setClients([...clients, savedClient]);
        toast({
          title: "Succès",
          description: "Client créé avec succès",
        });
      }

      handleCloseDialog();
    } catch (err) {
      console.error("Error saving client:", err);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le client",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    form.reset(client); // populate form for editing
    setIsDialogOpen(true);
  };

  const handleArchive = async (client: Client, archive: boolean) => {
    try {
      const res = await fetch(`${API_URL}/clients/${client.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: archive }),
      });

      if (!res.ok) {
        throw new Error("Failed to archive client");
      }

      // Update local state immediately for instant UI update
      if (!showArchived && archive) {
        // If we're viewing active clients and archiving one, remove it from the list
        setClients(clients.filter(c => c.id !== client.id));
      } else if (showArchived && !archive) {
        // If we're viewing archived clients and restoring one, remove it from the list
        setClients(clients.filter(c => c.id !== client.id));
      } else {
        // Otherwise, just update the archived status
        setClients(clients.map(c => 
          c.id === client.id ? { ...c, archived: archive } : c
        ));
      }
      
      setIsArchiveDialogOpen(false);
      setSelectedClient(null);
      
      toast({
        title: "Succès",
        description: `Client ${archive ? "archivé" : "restauré"} avec succès`,
      });
    } catch (err) {
      console.error("Error archiving client:", err);
      toast({
        title: "Erreur",
        description: `Impossible de ${archive ? "archiver" : "restaurer"} le client`,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredClients = clients.filter(client =>
    client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <User className="h-8 w-8 text-primary" />
            Gestion des Clients
          </h2>
          <p className="text-muted-foreground mt-1">
            {showArchived ? "Clients archivés" : "Clients actifs"}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Modifier le client" : "Nouveau client"}</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="nom" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="prenom" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="tel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="adresse" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="date_naissance" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de naissance</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Annuler</Button>
                  <Button type="submit">{editingClient ? "Modifier" : "Créer"}</Button>
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
              {selectedClient?.archived ? "Restaurer le client" : "Archiver le client"}
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir {selectedClient?.archived ? "restaurer" : "archiver"} le client {selectedClient?.prenom} {selectedClient?.nom} ?
              {!selectedClient?.archived && " Le client n'apparaîtra plus dans la liste des clients actifs."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => selectedClient && handleArchive(selectedClient, !selectedClient.archived)}
            >
              {selectedClient?.archived ? "Restaurer" : "Archiver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Liste des clients ({filteredClients.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <Label htmlFor="show-archived" className="text-sm whitespace-nowrap">
                  Voir les clients archivés
                </Label>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-16 w-16 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? "Aucun client trouvé" : showArchived ? "Aucun client archivé" : "Aucun client"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm 
                  ? "Aucun client ne correspond à votre recherche. Essayez d'autres termes."
                  : showArchived 
                    ? "Vous n'avez aucun client archivé pour le moment."
                    : "Commencez par ajouter votre premier client."
                }
              </p>
              {!searchTerm && !showArchived && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un client
                    </Button>
                  </DialogTrigger>
                </Dialog>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Date de naissance</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map(client => (
                  <TableRow key={client.id} className={client.archived ? "opacity-70 bg-muted/30" : ""}>
                    <TableCell className="font-medium">{client.nom}</TableCell>
                    <TableCell>{client.prenom}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.tel && <div className="text-sm">{client.tel}</div>}
                        {client.email && <div className="text-sm text-muted-foreground">{client.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{client.date_naissance ? new Date(client.date_naissance).toLocaleDateString('fr-FR') : ""}</TableCell>
                    <TableCell>
                      {client.notes && (
                        <Badge variant="secondary" className="text-xs">
                          {client.notes.length > 20 ? `${client.notes.substring(0, 20)}...` : client.notes}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.archived ? "outline" : "default"}>
                        {client.archived ? "Archivé" : "Actif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                      <ClientPurchaseHistory client={client} />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEdit(client)}
                                disabled={client.archived}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{client.archived ? "Client archivé - modification désactivée" : "Modifier le client"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={client.archived ? "text-green-600 hover:text-green-700" : "text-amber-600 hover:text-amber-700"}
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsArchiveDialogOpen(true);
                                }}
                              >
                                {client.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{client.archived ? "Restaurer le client" : "Archiver le client"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};