import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Glasses, AlertCircle, CheckCircle2 } from "lucide-react";

interface LoginPageProps {
  onLogin: (id: number, username: string, role: string) => void;
}

export const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("vendeur");
  const [adminCode, setAdminCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    try {
      const url = isRegister
        ? "http://127.0.0.1:3001/register"
        : "http://127.0.0.1:3001/login";

      const body: any = { username, password };
      if (isRegister) {
        body.fullName = fullName;
        body.role = role;
        if (role === "admin") body.adminCode = adminCode;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        if (isRegister) {
          setSuccessMessage("✅ Inscription réussie. Vous pouvez maintenant vous connecter !");
          setIsRegister(false);
          // Clear form
          setFullName("");
          setUsername("");
          setPassword("");
          setAdminCode("");
        } else {
          // ✅ Pass the user to App, let App handle storage + expiry
          onLogin(data.user.id, data.user.username, data.user.role);
        }
      } else {
        setErrorMessage(data.message || "Une erreur s'est produite");
        
        // Set field-specific errors if provided by the backend
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
      }
    } catch (err) {
      setErrorMessage("Erreur de connexion au serveur");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-md">
              <Glasses className="h-10 w-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">Optique Pro</CardTitle>
              <CardDescription className="text-base text-gray-600">
                {isRegister
                  ? "Créer un compte"
                  : "Système de gestion professionnel"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-red-700 text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-green-700 text-sm">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-gray-700">Nom complet</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fieldErrors.fullName) setFieldErrors({...fieldErrors, fullName: ""});
                      }}
                      placeholder="Entrez votre nom complet"
                      required
                      className={`h-12 ${fieldErrors.fullName ? "border-red-500 focus:ring-red-500" : ""}`}
                    />
                    {fieldErrors.fullName && (
                      <p className="text-red-500 text-xs flex items-center mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-gray-700">Rôle</Label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-12 border rounded-lg px-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="vendeur">Vendeur</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {role === "admin" && (
                    <div className="space-y-2">
                      <Label htmlFor="adminCode" className="text-gray-700">Code Admin</Label>
                      <Input
                        id="adminCode"
                        type="text"
                        value={adminCode}
                        onChange={(e) => {
                          setAdminCode(e.target.value);
                          if (fieldErrors.adminCode) setFieldErrors({...fieldErrors, adminCode: ""});
                        }}
                        placeholder="Entrez le code admin"
                        required
                        className={`h-12 ${fieldErrors.adminCode ? "border-red-500 focus:ring-red-500" : ""}`}
                      />
                      {fieldErrors.adminCode && (
                        <p className="text-red-500 text-xs flex items-center mt-1">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {fieldErrors.adminCode}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors({...fieldErrors, username: ""});
                  }}
                  placeholder="Entrez votre nom d'utilisateur"
                  required
                  className={`h-12 ${fieldErrors.username ? "border-red-500 focus:ring-red-500" : ""}`}
                />
                {fieldErrors.username && (
                  <p className="text-red-500 text-xs flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors({...fieldErrors, password: ""});
                    }}
                    placeholder="Entrez votre mot de passe"
                    required
                    className={`h-12 pr-12 ${fieldErrors.password ? "border-red-500 focus:ring-red-500" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {fieldErrors.password && (
                  <p className="text-red-500 text-xs flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isRegister ? "Création..." : "Connexion..."}
                  </div>
                ) : isRegister ? (
                  "S'inscrire"
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <button
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                onClick={() => {
                  setIsRegister(!isRegister);
                  clearMessages();
                }}
              >
                {isRegister ? "Retour à la connexion" : "Créer un compte"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};