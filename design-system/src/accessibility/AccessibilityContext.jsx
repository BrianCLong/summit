import React, { createContext, useContext, useState, useEffect } from "react";
import { prefersReducedMotion, prefersHighContrast, prefersDarkMode } from "./accessibility-utils";

// Create accessibility context
const AccessibilityContext = createContext();

// Accessibility provider component
export const AccessibilityProvider = ({ children }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  const [prefersDarkMode, setPrefersDarkMode] = useState(false);
  const [isHighContrastMode, setIsHighContrastMode] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);

  useEffect(() => {
    // Initialize accessibility preferences
    setPrefersReducedMotion(prefersReducedMotion());
    setPrefersHighContrast(prefersHighContrast());
    setPrefersDarkMode(prefersDarkMode());

    // Listen for changes in accessibility preferences
    const motionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const contrastMediaQuery = window.matchMedia("(prefers-contrast: high)");
    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleMotionChange = (e) => setPrefersReducedMotion(e.matches);
    const handleContrastChange = (e) => setPrefersHighContrast(e.matches);
    const handleDarkModeChange = (e) => setPrefersDarkMode(e.matches);

    motionMediaQuery.addEventListener("change", handleMotionChange);
    contrastMediaQuery.addEventListener("change", handleContrastChange);
    darkModeMediaQuery.addEventListener("change", handleDarkModeChange);

    // Enable keyboard navigation detection
    const handleKeyDown = (e) => {
      if (e.key === "Tab") {
        setKeyboardNavigation(true);
      }
    };

    const handleMouseDown = () => {
      setKeyboardNavigation(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      motionMediaQuery.removeEventListener("change", handleMotionChange);
      contrastMediaQuery.removeEventListener("change", handleContrastChange);
      darkModeMediaQuery.removeEventListener("change", handleDarkModeChange);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  const toggleHighContrast = () => {
    setIsHighContrastMode(!isHighContrastMode);
  };

  const value = {
    prefersReducedMotion,
    prefersHighContrast,
    prefersDarkMode,
    isHighContrastMode,
    keyboardNavigation,
    toggleHighContrast,
  };

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

// Custom hook to use accessibility context
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
};
