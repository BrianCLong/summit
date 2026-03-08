"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Mobile Field Ops App Entry Point
 */
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const theme_1 = require("./theme");
const AuthContext_1 = require("./contexts/AuthContext");
const NetworkContext_1 = require("./contexts/NetworkContext");
const PinGate_1 = require("./components/PinGate");
const AppShell_1 = require("./components/AppShell");
// Pages
const LoginPage_1 = require("./pages/LoginPage");
const AlertsPage_1 = require("./pages/AlertsPage");
const CasesPage_1 = require("./pages/CasesPage");
const CaseDetailPage_1 = require("./pages/CaseDetailPage");
const EntityDetailPage_1 = require("./pages/EntityDetailPage");
const ProfilePage_1 = require("./pages/ProfilePage");
// Protected route wrapper
function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = (0, AuthContext_1.useAuth)();
    if (loading) {
        return (<div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
            }}>
        Loading...
      </div>);
    }
    if (!isAuthenticated) {
        return <react_router_dom_1.Navigate to="/login" replace/>;
    }
    return <PinGate_1.PinGate>{children}</PinGate_1.PinGate>;
}
// App component with routing
function App() {
    return (<react_router_dom_1.BrowserRouter>
      <react_router_dom_1.Routes>
        {/* Public routes */}
        <react_router_dom_1.Route path="/login" element={<LoginPage_1.LoginPage />}/>

        {/* Protected routes with app shell */}
        <react_router_dom_1.Route element={<ProtectedRoute>
              <AppShell_1.AppShell />
            </ProtectedRoute>}>
          <react_router_dom_1.Route path="/" element={<AlertsPage_1.AlertsPage />}/>
          <react_router_dom_1.Route path="/cases" element={<CasesPage_1.CasesPage />}/>
          <react_router_dom_1.Route path="/cases/:id" element={<CaseDetailPage_1.CaseDetailPage />}/>
          <react_router_dom_1.Route path="/entities/:id" element={<EntityDetailPage_1.EntityDetailPage />}/>
          <react_router_dom_1.Route path="/profile" element={<ProfilePage_1.ProfilePage />}/>
        </react_router_dom_1.Route>

        {/* Catch all */}
        <react_router_dom_1.Route path="*" element={<react_router_dom_1.Navigate to="/" replace/>}/>
      </react_router_dom_1.Routes>
    </react_router_dom_1.BrowserRouter>);
}
// Root render with providers
client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode>
    <material_1.ThemeProvider theme={theme_1.mobileTheme}>
      <material_1.CssBaseline />
      <AuthContext_1.AuthProvider>
        <NetworkContext_1.NetworkProvider>
          <App />
        </NetworkContext_1.NetworkProvider>
      </AuthContext_1.AuthProvider>
    </material_1.ThemeProvider>
  </react_1.default.StrictMode>);
// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
            console.log('SW registered:', registration);
        })
            .catch((error) => {
            console.log('SW registration failed:', error);
        });
    });
}
