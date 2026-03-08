"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeProvider = ThemeProvider;
exports.useTheme = useTheme;
// @ts-nocheck
const react_1 = require("react");
const ThemeContext = (0, react_1.createContext)(undefined);
function ThemeProvider({ children }) {
    const [theme, setTheme] = (0, react_1.useState)('system');
    const [resolvedTheme, setResolvedTheme] = (0, react_1.useState)('light');
    (0, react_1.useEffect)(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const updateResolvedTheme = () => {
            if (theme === 'system') {
                setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
            }
            else {
                setResolvedTheme(theme);
            }
        };
        updateResolvedTheme();
        mediaQuery.addEventListener('change', updateResolvedTheme);
        return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
    }, [theme]);
    (0, react_1.useEffect)(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(resolvedTheme);
    }, [resolvedTheme]);
    return (<ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>);
}
function useTheme() {
    const context = (0, react_1.useContext)(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
