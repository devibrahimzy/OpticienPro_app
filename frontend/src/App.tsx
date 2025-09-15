import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "@/components/LoginPage";
import { Dashboard } from "@/components/Dashboard";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient();

interface User {
  id: number;
  username: string;
  role: string;
  expiresAt?: number; // timestamp in ms
}

// Simple encode/decode for storage (base64)
const encode = (obj: any) => btoa(JSON.stringify(obj));
const decode = (str: string) => JSON.parse(atob(str));

// Session duration in milliseconds (300 min here)
const SESSION_DURATION = 300 * 60 * 1000;

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle logout
  const handleLogout = useCallback(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // Handle login
  const handleLogin = (id: number, username: string, role: string) => {
    const loggedUser: User = {
      id,
      username,
      role,
      expiresAt: Date.now() + SESSION_DURATION,
    };
    localStorage.setItem("user", encode(loggedUser));
    setUser(loggedUser);
  };

  // Update expiresAt on activity
  const refreshSession = useCallback(() => {
    if (user) {
      const updatedUser = { ...user, expiresAt: Date.now() + SESSION_DURATION };
      localStorage.setItem("user", encode(updatedUser));
      setUser(updatedUser);
    }
  }, [user]);

  useEffect(() => {
    // Load user from storage
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsed: User = decode(savedUser);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          setUser(parsed);
        } else {
          localStorage.removeItem("user");
        }
      } catch (err) {
        console.error("Failed to parse stored user", err);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);

    // Auto-logout interval
    const interval = setInterval(() => {
      if (user && user.expiresAt && user.expiresAt <= Date.now()) {
        handleLogout();
      }
    }, 1000); // check every second

    // Activity listeners to refresh session
    const events = ["mousemove", "keydown", "mousedown", "touchstart"];
    events.forEach(e => window.addEventListener(e, refreshSession));

    return () => {
      clearInterval(interval);
      events.forEach(e => window.removeEventListener(e, refreshSession));
    };
  }, [user, handleLogout, refreshSession]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {user ? (
          <ThemeProvider userId={user.id}>
            <Dashboard user={user} onLogout={handleLogout} />
          </ThemeProvider>
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
