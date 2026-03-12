import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface BrandPack {
  name: string;
  productName: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  identity?: {
    logo?: string;
    favicon?: string;
  };
}

const defaultBrand: BrandPack = {
  name: 'Switchboard',
  productName: 'Switchboard',
  colors: {
    primary: '#0078ff',
    secondary: '#005cc5',
    accent: '#00c3ff',
    background: '#0a0a0a',
  },
};

interface ThemeContextType {
  brand: BrandPack;
  setBrand: (brand: BrandPack) => void;
  loadBrand: (name: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brand, setBrand] = useState<BrandPack>(defaultBrand);

  useEffect(() => {
    // Apply colors to CSS variables
    const root = document.documentElement;
    if (brand && brand.colors) {
      root.style.setProperty('--color-primary', brand.colors.primary);
      root.style.setProperty('--color-secondary', brand.colors.secondary);
      root.style.setProperty('--color-accent', brand.colors.accent);
      root.style.setProperty('--color-background', brand.colors.background);
    }
  }, [brand]);

  const loadBrand = async (name: string) => {
    try {
      const response = await fetch(`/brands/${name}.json`);
      if (response.ok) {
        const data = await response.json();
        // Ensure data matches our expected structure
        if (data.colors) {
          setBrand(data);
        } else if (data.primary) {
           // Handle flat structure if encountered
           setBrand({
             name: data.name,
             productName: data.productName || data.name,
             colors: {
               primary: data.primary,
               secondary: data.secondary || data.primary,
               accent: data.accent || data.primary,
               background: data.background || '#0a0a0a'
             }
           });
        }
      }
    } catch (error) {
      console.error('Error loading brand pack:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ brand, setBrand, loadBrand }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
