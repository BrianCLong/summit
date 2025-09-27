import { createContext, useContext, useEffect, useState } from "react";

const PreferencesContext = createContext();

export const usePreferences = () => useContext(PreferencesContext);

export function PreferencesProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("prefers-dark") === "true";
  });
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem("prefers-contrast") === "true";
  });
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 640px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const handler = () => setIsMobile(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    localStorage.setItem("prefers-dark", darkMode);
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("prefers-contrast", highContrast);
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add("contrast");
    } else {
      root.classList.remove("contrast");
    }
  }, [highContrast]);

  const value = {
    darkMode,
    highContrast,
    isMobile,
    toggleDarkMode: () => setDarkMode((v) => !v),
    toggleHighContrast: () => setHighContrast((v) => !v),
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
