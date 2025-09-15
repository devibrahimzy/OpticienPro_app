// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode; userId: number }> = ({ 
  children, 
  userId 
}) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetch(`http://127.0.0.1:3001/settings/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setDarkMode(data.dark_mode === 1);
        document.documentElement.classList.toggle("dark", data.dark_mode === 1);
      });
  }, [userId]);

  const toggleDarkMode = async () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    document.documentElement.classList.toggle("dark", newValue);
    
    try {
      await fetch(`http://127.0.0.1:3001/settings/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dark_mode: newValue ? 1 : 0 }),
      });
    } catch (err) {
      console.error("Erreur lors de la mise à jour du mode sombre:", err);
    }
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};