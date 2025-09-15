import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Eye,
  UserCheck,
  Package2,
  LogOut,
  Home,
  Settings,
  FileText,
  CreditCard,
  Truck,
} from "lucide-react";

import { ClientsModule } from "./modules/ClientsModule/ClientsModule";
import { ProduitsModule } from "./modules/ProduitsModule/ProduitsModule";
import FournisseursModule from "./modules/FournisseursModule";
import { VentesModule } from "./modules/VentesModule/VentesModule";
import { MutuellesModule } from "./modules/MutuellesModule";
import { FacturesModule } from "./modules/FacturesModule";
import { RapportsModule } from "./modules/RapportsModule";
import DashboardModule from "./modules/DashboardModule";
import { ParametresModule } from "./modules/ParametresModule";
import UsersModule from "./modules/UsersModule"; // ✅ new module

interface DashboardProps {
  user: { id: number; username: string; role: string };
  onLogout: () => void;
}

export const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeModule, setActiveModule] = useState("dashboard");

  const modules = [
  { id: "dashboard", name: "Tableau de bord", icon: Home },
  ...(user.role === "admin"
    ? [{ id: "users", name: "Utilisateurs", icon: UserCheck }]
    : []), // ✅ only admins see this, right after dashboard
  { id: "clients", name: "Clients", icon: Users },
  { id: "produits", name: "Produits", icon: Package },
  { id: "fournisseurs", name: "Fournisseurs", icon: Truck },
  { id: "ventes", name: "Ventes", icon: ShoppingCart },
  { id: "mutuelles", name: "Mutuelles", icon: CreditCard },
  { id: "factures", name: "Facturation", icon: FileText },
  { id: "rapports", name: "Rapports", icon: TrendingUp },
  { id: "parametres", name: "Paramètres", icon: Settings },
];


  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-sidebar border-r border-sidebar-border flex flex-col justify-between sticky top-0 h-screen">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary dark:bg-amber-700 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-primary-foreground dark:text-white" />
            </div>
            <div>
              <h1 className="text-sidebar-foreground font-bold text-lg">Optique Pro</h1>
              <p className="text-sidebar-foreground/70 text-sm">Gestion complète</p>
            </div>
          </div>

          {/* Module Buttons */}
          <div className="space-y-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Button
                  key={module.id}
                  variant={activeModule === module.id ? "secondary" : "ghost"}
                  className={`w-full justify-start h-12 ${
                    activeModule === module.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }`}
                  onClick={() => setActiveModule(module.id)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {module.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* User Info + Logout */}
        <div className="w-full px-6 mb-6">
          <div className="bg-sidebar-accent/50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sidebar-foreground font-medium">{user.username}</p>
                <p className="text-sidebar-foreground/70 text-sm capitalize">{user.role}</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full text-sidebar-foreground hover:bg-sidebar-accent/50 flex items-center justify-start"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {activeModule === "dashboard" && (
            <DashboardModule
              userId={user.id}
              username={user.username}
              role={user.role}
            />
          )}
          {activeModule === "clients" && <ClientsModule />}
          {activeModule === "produits" && <ProduitsModule />}
          {activeModule === "fournisseurs" && <FournisseursModule />}
          {activeModule === "ventes" && (
            <VentesModule
              userId={user.id}
              username={user.username}
              role={user.role}
            />
          )}
          {activeModule === "mutuelles" && <MutuellesModule />}
          {activeModule === "factures" && <FacturesModule userId={user.id} username={user.username} role={user.role} />}
          {activeModule === "rapports" && (
            <RapportsModule
              userId={user.id}
              username={user.username}
              role={user.role}
            />
          )}
          {activeModule === "parametres" && (
            <ParametresModule
              userId={user.id}
              username={user.username}
              role={user.role}
            />
          )}
          {activeModule === "users" && user.role === "admin" && <UsersModule userId={user.id} username={user.username} role={user.role} />}
        </div>
      </div>
    </div>
  );
};
