import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, User, Shield } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ParametresModuleProps {
  userId: number;
  username: string;
  role: string;
}

export const ParametresModule = ({ userId, username, role }: ParametresModuleProps) => {
  const { darkMode, toggleDarkMode } = useTheme();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Password visibility state (single state for all fields)
  const [showPasswords, setShowPasswords] = useState(false);

  // Handle password change
  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Veuillez remplir tous les champs !");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Le nouveau mot de passe et la confirmation ne correspondent pas !");
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:3001/users/${userId}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors du changement de mot de passe");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-2">Paramètres</h2>
        <p className="text-muted-foreground text-lg">
          Personnalisez votre boutique d'opticien et votre compte utilisateur
        </p>
      </div>

      {/* Profile Information */}
      <Card className="bg-card shadow-lg border-0 rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Profil Utilisateur
          </CardTitle>
          <CardDescription>Informations de votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{username}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium capitalize">{role}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card className="bg-card shadow-lg border-0 rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Apparence</CardTitle>
          <CardDescription>Choisissez le mode d'affichage de l'application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="dark-mode">Mode sombre</Label>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={toggleDarkMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="bg-card shadow-lg border-0 rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Changer le mot de passe</CardTitle>
          <CardDescription>Modifiez votre mot de passe pour sécuriser votre compte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
            </div>
          </div>

          {/* Single toggle button for all password fields */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2"
            >
              {showPasswords ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Masquer les mots de passe
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Afficher les mots de passe
                </>
              )}
            </Button>

            <Button
              onClick={handlePasswordChange}
              className="bg-primary text-primary-foreground hover:bg-primary-glow"
            >
              Changer le mot de passe
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};