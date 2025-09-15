import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Calendar, Download, Filter, Users, ShoppingCart, Package, CreditCard } from "lucide-react";
import html2pdf from "html2pdf.js";

const API_BASE_URL = 'http://127.0.0.1:3001/api';

// Default data structure
const defaultData = {
  ventesParMois: [],
  produitsPopulaires: [],
  topClients: [],
  kpi: {
    total_ventes: 0,
    chiffre_affaires: 0,
    panier_moyen: 0,
    nouveaux_clients: 0
  }
};

export const RapportsModule = ({ userId, username, role }) => {
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0].replace(/-\d{2}$/, '-01'));
  const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(defaultData);

  const fetchData = async () => {
  if (!userId) return;
  
  setLoading(true);
  setError(null);
  try {
    const params = new URLSearchParams({
      dateDebut,
      dateFin,
      userId, // Pass user ID to filter data
      userRole: role // Pass user role to determine if admin
    });

    const requests = [
      fetch(`${API_BASE_URL}/rapports/ventes-par-mois?${params}`),
      fetch(`${API_BASE_URL}/rapports/produits-populaires?${params}`),
      fetch(`${API_BASE_URL}/rapports/top-clients?${params}`),
      fetch(`${API_BASE_URL}/rapports/kpi?${params}`)
    ];

      const responses = await Promise.all(requests);
      
      // Check for errors
      const errors = responses.filter(response => !response.ok);
      if (errors.length > 0) {
        throw new Error(`API error: ${errors[0].status}`);
      }

      const [
        ventesData,
        produitsData,
        clientsData,
        kpiData
      ] = await Promise.all(responses.map(r => r.json()));

      // Ensure all data is in the correct format
      setData({
        ventesParMois: Array.isArray(ventesData) ? ventesData : [],
        produitsPopulaires: Array.isArray(produitsData) ? produitsData : [],
        topClients: Array.isArray(clientsData) ? clientsData : [],
        kpi: kpiData && typeof kpiData === 'object' ? kpiData : defaultData.kpi
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const exportToPDF = () => {
    // Get the element to export
    const element = document.getElementById('rapport-content');
    
    // Add user information to the PDF
    const userInfo = document.createElement('div');
    userInfo.style.marginBottom = '20px';
    userInfo.innerHTML = `
      <h3>Rapport généré par: ${username} (${role})</h3>
      <p>Période: ${dateDebut} au ${dateFin}</p>
    `;
    
    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true);
    clonedElement.insertBefore(userInfo, clonedElement.firstChild);
    
    // Options for PDF generation
    const options = {
      margin: 10,
      filename: `rapport-${dateDebut}-${dateFin}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Generate PDF
    html2pdf().set(options).from(clonedElement).save();
  };

  const applyFilters = () => {
    fetchData();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="text-destructive font-medium">Erreur lors du chargement des données</div>
        <Button onClick={fetchData}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="rapport-content">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Rapports et Analyses
          </h2>
          <p className="text-muted-foreground">Analysez les performances de votre magasin</p>
          <p className="text-sm text-muted-foreground">Utilisateur: {username} ({role})</p>
        </div>
        
        <Button onClick={exportToPDF} className="bg-primary hover:bg-primary/90">
          <Download className="h-4 w-4 mr-2" />
          Exporter PDF
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card shadow-md border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date de début</label>
              <Input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Date de fin</label>
              <Input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={applyFilters} variant="outline" className="w-full">
                Appliquer les filtres
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Ventes totales</p>
                <p className="text-2xl font-bold text-foreground">{data.kpi.total_ventes}</p>
                
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-foreground">{data.kpi.chiffre_affaires.toFixed(2)} MAD</p>
               
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Nouveaux clients</p>
                <p className="text-2xl font-bold text-foreground">{data.kpi.nouveaux_clients}</p>
                
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Panier moyen</p>
                <p className="text-2xl font-bold text-foreground">{data.kpi.panier_moyen.toFixed(2)} MAD</p>
                
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card shadow-md border-0">
          <CardHeader>
            <CardTitle>Évolution des ventes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.ventesParMois.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.ventesParMois}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="ventes" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64 text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md border-0">
          <CardHeader>
            <CardTitle>Chiffre d'affaires mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            {data.ventesParMois.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.ventesParMois}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ca" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64 text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card shadow-md border-0">
          <CardHeader>
            <CardTitle>Répartition des produits vendus</CardTitle>
          </CardHeader>
          <CardContent>
            {data.produitsPopulaires.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.produitsPopulaires}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.produitsPopulaires.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64 text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md border-0">
          <CardHeader>
            <CardTitle>Top 5 des clients</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topClients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Commandes</TableHead>
                    <TableHead className="text-right">CA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topClients.map((client, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{client.nom}</div>
                          <div className="text-sm text-muted-foreground">
                            Dernière visite: {new Date(client.derniereVisite).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{client.commandes}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {client.ca.toFixed(2)} MAD
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex justify-center items-center h-64 text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};