"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginPage = LoginPage;
/**
 * Login Page
 * Handles OIDC-based authentication
 */
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const AuthContext_1 = require("@/contexts/AuthContext");
const react_router_dom_1 = require("react-router-dom");
function LoginPage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { login, deviceInfo } = (0, AuthContext_1.useAuth)();
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await login(email, password);
            navigate('/');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<material_1.Box sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
            bgcolor: 'background.default',
        }}>
      {/* Logo/Brand */}
      <material_1.Box sx={{ textAlign: 'center', mb: 4 }}>
        <icons_material_1.Security sx={{ fontSize: 64, color: 'primary.main', mb: 2 }}/>
        <material_1.Typography variant="h4" fontWeight={700}>
          Field Ops
        </material_1.Typography>
        <material_1.Typography variant="body2" color="text.secondary">
          IntelGraph Mobile
        </material_1.Typography>
      </material_1.Box>

      {/* Login Form */}
      <material_1.Card sx={{ width: '100%', maxWidth: 400 }}>
        <material_1.CardContent sx={{ p: 3 }}>
          <material_1.Typography variant="h6" gutterBottom>
            Sign In
          </material_1.Typography>

          {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </material_1.Alert>)}

          <form onSubmit={handleSubmit}>
            <material_1.TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus sx={{ mb: 2 }}/>

            <material_1.TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" InputProps={{
            endAdornment: (<material_1.InputAdornment position="end">
                    <material_1.IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <icons_material_1.VisibilityOff /> : <icons_material_1.Visibility />}
                    </material_1.IconButton>
                  </material_1.InputAdornment>),
        }} sx={{ mb: 3 }}/>

            <material_1.Button type="submit" variant="contained" fullWidth size="large" disabled={isLoading || !email || !password}>
              {isLoading ? (<material_1.CircularProgress size={24} color="inherit"/>) : ('Sign In')}
            </material_1.Button>
          </form>
        </material_1.CardContent>
      </material_1.Card>

      {/* Device Info */}
      {deviceInfo && (<material_1.Typography variant="caption" color="text.disabled" sx={{ mt: 3 }}>
          Device: {deviceInfo.deviceId.slice(0, 8)}...
        </material_1.Typography>)}
    </material_1.Box>);
}
exports.default = LoginPage;
