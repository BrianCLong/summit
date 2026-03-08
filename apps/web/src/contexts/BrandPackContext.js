"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandPackProvider = exports.useBrandPack = void 0;
const react_1 = __importDefault(require("react"));
const styles_1 = require("@mui/material/styles");
const CssBaseline_1 = __importDefault(require("@mui/material/CssBaseline"));
const config_1 = __importDefault(require("@/config"));
const DesignSystemProvider_1 = require("@/theme/DesignSystemProvider");
const tokens_1 = require("@/theme/tokens");
const TenantContext_1 = require("@/contexts/TenantContext");
const defaultBrandPack = {
    id: 'summit-default',
    name: 'Summit',
    websiteUrl: 'https://summit.example.com',
    logos: {
        primary: 'https://cdn.summit.example.com/brand/summit-primary.svg',
        mark: 'https://cdn.summit.example.com/brand/summit-mark.svg',
        inverted: 'https://cdn.summit.example.com/brand/summit-inverted.svg',
    },
    navLabels: {
        home: 'Home',
        investigations: 'Investigations',
        cases: 'Cases',
        dashboards: 'Dashboards',
        settings: 'Settings',
        support: 'Support',
    },
    tokens: {
        palette: {
            mode: 'dark',
            primary: '#0f766e',
            secondary: '#1d4ed8',
            accent: '#f59e0b',
            background: '#0b1120',
            surface: '#111827',
            text: {
                primary: '#f9fafb',
                secondary: '#cbd5f5',
            },
        },
        typography: {
            fontFamily: tokens_1.tokens.typography.fontFamily,
            baseSize: 16,
        },
        radii: {
            sm: Number(tokens_1.tokens.radii.sm),
            md: Number(tokens_1.tokens.radii.md),
            lg: Number(tokens_1.tokens.radii.lg),
            pill: Number(tokens_1.tokens.radii.pill),
        },
        spacing: {
            sm: Number(tokens_1.tokens.spacing.sm),
            md: Number(tokens_1.tokens.spacing.md),
            lg: Number(tokens_1.tokens.spacing.xl),
        },
        shadows: {
            sm: String(tokens_1.tokens.shadows.sm),
            md: String(tokens_1.tokens.shadows.md),
            lg: String(tokens_1.tokens.shadows.lg),
        },
    },
    updatedAt: '2026-01-05T02:02:27Z',
};
const BrandPackContext = react_1.default.createContext(undefined);
const useBrandPack = () => {
    const context = react_1.default.useContext(BrandPackContext);
    if (!context) {
        throw new Error('useBrandPack must be used within BrandPackProvider');
    }
    return context;
};
exports.useBrandPack = useBrandPack;
const buildTokenOverrides = (pack) => {
    const radii = pack.tokens.radii ?? {};
    const spacing = pack.tokens.spacing ?? {};
    const typography = pack.tokens.typography;
    const shadows = pack.tokens.shadows ?? {};
    return {
        'ds-font-family-sans': typography?.fontFamily ?? tokens_1.tokens.typography.fontFamily,
        'ds-radius-sm': radii.sm ?? tokens_1.tokens.radii.sm,
        'ds-radius-md': radii.md ?? tokens_1.tokens.radii.md,
        'ds-radius-lg': radii.lg ?? tokens_1.tokens.radii.lg,
        'ds-radius-pill': radii.pill ?? tokens_1.tokens.radii.pill,
        'ds-space-sm': spacing.sm ?? tokens_1.tokens.spacing.sm,
        'ds-space-md': spacing.md ?? tokens_1.tokens.spacing.md,
        'ds-space-lg': spacing.lg ?? tokens_1.tokens.spacing.lg,
        'ds-shadow-sm': shadows.sm ?? tokens_1.tokens.shadows.sm,
        'ds-shadow-md': shadows.md ?? tokens_1.tokens.shadows.md,
        'ds-shadow-lg': shadows.lg ?? tokens_1.tokens.shadows.lg,
    };
};
const buildMuiTheme = (pack) => {
    const palette = pack.tokens.palette;
    return (0, styles_1.createTheme)({
        palette: {
            mode: palette.mode,
            primary: { main: palette.primary },
            secondary: palette.secondary ? { main: palette.secondary } : undefined,
            background: {
                default: palette.background,
                paper: palette.surface,
            },
            text: {
                primary: palette.text.primary,
                secondary: palette.text.secondary ?? palette.text.primary,
            },
        },
        typography: {
            fontFamily: pack.tokens.typography?.fontFamily,
            fontSize: pack.tokens.typography?.baseSize,
        },
        shape: {
            borderRadius: pack.tokens.radii?.md ?? 16,
        },
    });
};
async function fetchBrandPack(tenantId) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${config_1.default.apiBaseUrl}/brand-packs/tenants/${tenantId}`, {
        credentials: 'include',
        headers: token
            ? {
                Authorization: `Bearer ${token}`,
            }
            : undefined,
    });
    if (!response.ok) {
        throw new Error(`Failed to load brand pack (${response.status})`);
    }
    const data = await response.json();
    return data.pack;
}
const BrandPackProvider = ({ children, }) => {
    const { currentTenant } = (0, TenantContext_1.useTenant)();
    const [state, setState] = react_1.default.useState({
        pack: defaultBrandPack,
        loading: true,
    });
    react_1.default.useEffect(() => {
        if (!currentTenant?.id) {
            setState(prev => ({ ...prev, loading: false }));
            return;
        }
        let isActive = true;
        setState(prev => ({ ...prev, loading: true, error: undefined }));
        fetchBrandPack(currentTenant.id)
            .then(pack => {
            if (!isActive)
                return;
            setState({ pack, loading: false });
        })
            .catch(error => {
            if (!isActive)
                return;
            setState({
                pack: defaultBrandPack,
                loading: false,
                error: error.message,
            });
        });
        return () => {
            isActive = false;
        };
    }, [currentTenant?.id]);
    const muiTheme = react_1.default.useMemo(() => buildMuiTheme(state.pack), [state.pack]);
    const tokenOverrides = react_1.default.useMemo(() => buildTokenOverrides(state.pack), [state.pack]);
    return (<BrandPackContext.Provider value={state}>
      <DesignSystemProvider_1.DesignSystemProvider tokenOverrides={tokenOverrides} enableTokens>
        <styles_1.ThemeProvider theme={muiTheme}>
          <CssBaseline_1.default />
          {children}
        </styles_1.ThemeProvider>
      </DesignSystemProvider_1.DesignSystemProvider>
    </BrandPackContext.Provider>);
};
exports.BrandPackProvider = BrandPackProvider;
