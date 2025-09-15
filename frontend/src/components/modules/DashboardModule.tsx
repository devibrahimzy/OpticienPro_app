import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShoppingCart, 
  Package, 
  Users, 
  Package2, 
  AlertTriangle,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface DashboardModuleProps {
  userId: number;
  username: string;
  role: string;
}

const DashboardModule = ({ userId, username, role }: DashboardModuleProps) => {
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [incompleteSales, setIncompleteSales] = useState([]);
  const API_URL = "http://127.0.0.1:3001";
  
  // Pagination states
  const [recentSalesPage, setRecentSalesPage] = useState(1);
  const [lowStockPage, setLowStockPage] = useState(1);
  const [pendingOrdersPage, setPendingOrdersPage] = useState(1);
  const [incompleteSalesPage, setIncompleteSalesPage] = useState(1);
  
  const ITEMS_PER_PAGE = 5; // Number of items to show per section

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all dashboard data from backend with userId parameter
      const [statsRes, salesRes, stockRes, ordersRes, incompleteSalesRes] = await Promise.all([
      fetch(`${API_URL}/api/dashboard/stats?userId=${userId}&userRole=${role}`),
      fetch(`${API_URL}/api/dashboard/recent-sales?userId=${userId}&userRole=${role}`),
      fetch(`${API_URL}/api/dashboard/low-stock`),
      fetch(`${API_URL}/api/dashboard/pending-orders`),
      fetch(`${API_URL}/api/dashboard/incomplete-sales?userId=${userId}&userRole=${role}`)
    ]);
      
      // Check if responses are valid JSON
      const statsText = await statsRes.text();
      const salesText = await salesRes.text();
      const stockText = await stockRes.text();
      const ordersText = await ordersRes.text();
      const incompleteSalesText = await incompleteSalesRes.text();
      
      // Try to parse JSON, but handle HTML responses gracefully
      let statsData, salesData, stockData, ordersData, incompleteSalesData;
      
      try {
        statsData = statsText.startsWith('{') ? JSON.parse(statsText) : null;
      } catch (e) {
        console.error('Failed to parse stats JSON:', e);
        statsData = null;
      }
      
      try {
        salesData = salesText.startsWith('[') ? JSON.parse(salesText) : [];
      } catch (e) {
        console.error('Failed to parse sales JSON:', e);
        salesData = [];
      }
      
      try {
        stockData = stockText.startsWith('[') ? JSON.parse(stockText) : [];
      } catch (e) {
        console.error('Failed to parse stock JSON:', e);
        stockData = [];
      }
      
      try {
        ordersData = ordersText.startsWith('[') ? JSON.parse(ordersText) : [];
      } catch (e) {
        console.error('Failed to parse orders JSON:', e);
        ordersData = [];
      }
      
      try {
        incompleteSalesData = incompleteSalesText.startsWith('[') ? JSON.parse(incompleteSalesText) : [];
      } catch (e) {
        console.error('Failed to parse incomplete sales JSON:', e);
        incompleteSalesData = [];
      }
      
      // If API returned HTML instead of JSON, show error
      if (statsText.includes('<!DOCTYPE') || !statsData) {
        toast({
          title: "Erreur API",
          description: "Les endpoints API ne sont pas configurés correctement",
          variant: "destructive"
        });
        
        // Use fallback data
        setStats({
          totalClients: 0,
          todaySales: 0,
          lowStockItems: 0,
          pendingOrders: 0,
          unpaidInvoices: 0
        });
      } else {
        setStats(statsData);
      }
      
      setRecentSales(salesData);
      setLowStock(stockData);
      setPendingOrders(ordersData);
      setIncompleteSales(incompleteSalesData);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Erreur de connexion",
        description: "Impossible de récupérer les données du dashboard",
        variant: "destructive"
      });
      
      // Set empty data on error
      setStats({
        totalClients: 0,
        todaySales: 0,
        lowStockItems: 0,
        pendingOrders: 0,
        unpaidInvoices: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Get paginated items
  const getPaginatedItems = (items, currentPage) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  // Calculate total pages
  const getTotalPages = (items) => {
    return Math.ceil(items.length / ITEMS_PER_PAGE);
  };

  // Stats cards data
  const statsCards = [
    { 
      title: "Clients actifs", 
      value: stats?.totalClients || 0, 
      icon: Users, 
      color: "text-blue-500",
      description: "Clients non archivés"
    },
    { 
      title: "Ventes du jour", 
      value: formatCurrency(stats?.todaySales), 
      icon: ShoppingCart, 
      color: "text-green-500",
      description: "Chiffre d'affaires aujourd'hui"
    },
    { 
      title: "Articles en stock faible", 
      value: stats?.lowStockItems || 0, 
      icon: AlertTriangle, 
      color: "text-amber-500",
      description: "Produits à réapprovisionner"
    },
    { 
      title: "Commandes en attente", 
      value: stats?.pendingOrders || 0, 
      icon: Package2, 
      color: "text-purple-500",
      description: "Commandes non livrées"
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Tableau de bord</h2>
            <p className="text-muted-foreground">Bienvenue, {username} ({role})</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-16 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-16 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Tableau de bord</h2>
          <p className="text-muted-foreground">Bienvenue, {username} ({role})</p>
        </div>
        <div className="flex gap-2">
                   <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDashboardData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </div>
                  <div
                    className={`w-12 h-12 ${stat.color} bg-current/10 rounded-lg flex items-center justify-center`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Ventes récentes
            </CardTitle>
            <CardDescription>Dernières transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <div className="space-y-4">
                {getPaginatedItems(recentSales, recentSalesPage).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {sale.prenom} {sale.nom}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(sale.date_vente)}
                      </p>
                    </div>
                    <p className="font-bold text-accent">
                      {formatCurrency(sale.total_ttc)}
                    </p>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {getTotalPages(recentSales) > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recentSalesPage === 1}
                      onClick={() => setRecentSalesPage(recentSalesPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {recentSalesPage} sur {getTotalPages(recentSales)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recentSalesPage === getTotalPages(recentSales)}
                      onClick={() => setRecentSalesPage(recentSalesPage + 1)}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Aucune vente récente
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Stock faible
            </CardTitle>
            <CardDescription>Produits nécessitant un réapprovisionnement</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length > 0 ? (
              <div className="space-y-4">
                {getPaginatedItems(lowStock, lowStockPage).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center p-3 bg-amber-100 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.ref} - {item.marque}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.produit_type === 'monture' ? 'Monture' : 'Verre'} - Stock: {item.stock_total}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {getTotalPages(lowStock) > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={lowStockPage === 1}
                      onClick={() => setLowStockPage(lowStockPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {lowStockPage} sur {getTotalPages(lowStock)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={lowStockPage === getTotalPages(lowStock)}
                      onClick={() => setLowStockPage(lowStockPage + 1)}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Tous les produits sont bien approvisionnés
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Pending Orders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Commandes en attente
            </CardTitle>
            <CardDescription>Commandes non livrées</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingOrders.length > 0 ? (
              <div className="space-y-4">
                {getPaginatedItems(pendingOrders, pendingOrdersPage).map((order, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{order.ref} - {order.marque}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.produit_type === 'monture' ? 'Monture' : 'Verre'} - {order.quantite} unités
                      </p>
                      <p className="text-xs text-muted-foreground">Fournisseur: {order.fournisseur_nom}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(order.prix_unitaire * order.quantite)}</p>
                      <p className="text-xs text-muted-foreground">Demandé le {formatDate(order.date_demande)}</p>
                    </div>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {getTotalPages(pendingOrders) > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingOrdersPage === 1}
                      onClick={() => setPendingOrdersPage(pendingOrdersPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {pendingOrdersPage} sur {getTotalPages(pendingOrders)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingOrdersPage === getTotalPages(pendingOrders)}
                      onClick={() => setPendingOrdersPage(pendingOrdersPage + 1)}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Aucune commande en attente
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incomplete Sales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Ventes incomplètes
            </CardTitle>
            <CardDescription>Ventes non finalisées</CardDescription>
          </CardHeader>
          <CardContent>
            {incompleteSales.length > 0 ? (
              <div className="space-y-4">
                {getPaginatedItems(incompleteSales, incompleteSalesPage).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{sale.client_prenom} {sale.client_nom}</p>
                      <p className="text-sm text-muted-foreground">Statut: {sale.statut}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(sale.date_vente)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-accent">{formatCurrency(sale.total_ttc)}</p>
                    </div>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {getTotalPages(incompleteSales) > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={incompleteSalesPage === 1}
                      onClick={() => setIncompleteSalesPage(incompleteSalesPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {incompleteSalesPage} sur {getTotalPages(incompleteSales)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={incompleteSalesPage === getTotalPages(incompleteSales)}
                      onClick={() => setIncompleteSalesPage(incompleteSalesPage + 1)}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Aucune vente incomplète
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardModule;