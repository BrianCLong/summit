"use strict";
/**
 * Theme Provider Component
 * Provides dynamic theme switching based on user preferences and role
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeProvider = exports.useAppTheme = void 0;
const react_1 = __importStar(require("react"));
const styles_1 = require("@mui/material/styles");
const CssBaseline_1 = __importDefault(require("@mui/material/CssBaseline"));
const client_1 = require("@apollo/client");
const theme_queries_1 = require("./theme-queries");
const ThemeContext = (0, react_1.createContext)(undefined);
const useAppTheme = () => {
    const context = (0, react_1.useContext)(ThemeContext);
    if (!context) {
        throw new Error('useAppTheme must be used within ThemeProvider');
    }
    return context;
};
exports.useAppTheme = useAppTheme;
const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkModeState] = (0, react_1.useState)('system');
    const [systemDarkMode, setSystemDarkMode] = (0, react_1.useState)(window.matchMedia?.('(prefers-color-scheme: dark)').matches || false);
    // Query effective theme
    const { data, loading, refetch } = (0, client_1.useQuery)(theme_queries_1.GET_MY_EFFECTIVE_THEME, {
        variables: { systemDarkMode },
    });
    // Subscribe to theme updates
    (0, client_1.useSubscription)(theme_queries_1.THEME_UPDATED_SUBSCRIPTION, {
        onData: () => {
            refetch();
        },
    });
    // Mutation for updating preferences
    const [updatePreference] = (0, client_1.useMutation)(theme_queries_1.UPDATE_MY_THEME_PREFERENCE);
    // Listen to system dark mode changes
    (0, react_1.useEffect)(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            setSystemDarkMode(e.matches);
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);
    // Refresh theme when system dark mode changes
    (0, react_1.useEffect)(() => {
        if (darkMode === 'system') {
            refetch({ systemDarkMode });
        }
    }, [systemDarkMode, darkMode, refetch]);
    // Create MUI theme from config
    const theme = (0, react_1.useMemo)(() => {
        if (!data?.myEffectiveTheme?.theme) {
            return (0, styles_1.createTheme)(); // Default theme
        }
        const themeConfig = data.myEffectiveTheme.theme;
        // Determine actual mode
        let mode = 'light';
        if (darkMode === 'system') {
            mode = systemDarkMode ? 'dark' : 'light';
        }
        else {
            mode = darkMode;
        }
        // Override mode if present in config
        if (themeConfig.palette?.mode) {
            mode = themeConfig.palette.mode;
        }
        return (0, styles_1.createTheme)({
            palette: {
                mode,
                ...themeConfig.palette,
            },
            typography: themeConfig.typography,
            shape: themeConfig.shape,
            spacing: themeConfig.spacing || 8,
        });
    }, [data, darkMode, systemDarkMode]);
    const setDarkMode = (mode) => {
        setDarkModeState(mode);
        updatePreference({
            variables: {
                input: {
                    darkModePreference: mode.toUpperCase(),
                },
            },
        });
    };
    const customizeTheme = (overrides) => {
        updatePreference({
            variables: {
                input: {
                    customOverrides: overrides,
                },
            },
        }).then(() => refetch());
    };
    const resetTheme = () => {
        updatePreference({
            variables: {
                input: {
                    customOverrides: null,
                    autoSwitchByRole: true,
                },
            },
        }).then(() => refetch());
    };
    const value = {
        theme,
        themeSource: data?.myEffectiveTheme?.source?.toLowerCase() || 'default',
        themeName: data?.myEffectiveTheme?.themeName,
        darkMode,
        setDarkMode,
        customizeTheme,
        resetTheme,
        loading,
    };
    return (<ThemeContext.Provider value={value}>
      <styles_1.ThemeProvider theme={theme}>
        <CssBaseline_1.default />
        {children}
      </styles_1.ThemeProvider>
    </ThemeContext.Provider>);
};
exports.ThemeProvider = ThemeProvider;
