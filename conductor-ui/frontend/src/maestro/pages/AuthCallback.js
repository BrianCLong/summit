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
const react_1 = __importStar(require("react"));
const AuthContext_1 = require("../contexts/AuthContext");
const oidcService_1 = require("../services/oidcService");
const react_router_dom_1 = require("react-router-dom");
const AuthCallback = () => {
    const { login } = (0, AuthContext_1.useAuth)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const handleCallback = async () => {
            try {
                // Handle OIDC callback using the service
                const { user, tokens } = await oidcService_1.oidcService.handleCallback();
                // Use auth context login method to set all state
                await login({
                    user,
                    accessToken: tokens.access_token,
                    idToken: tokens.id_token,
                    expiresAt: Date.now() + tokens.expires_in * 1000,
                    refreshToken: tokens.refresh_token,
                });
                // Navigate to intended destination or home
                const intendedPath = sessionStorage.getItem('auth_return_path') || '/maestro';
                sessionStorage.removeItem('auth_return_path');
                navigate(intendedPath, { replace: true });
            }
            catch (err) {
                console.error('Authentication callback error:', err);
                setError(err instanceof Error ? err.message : 'Authentication failed');
            }
        };
        // Check if we have authorization code in URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code') || urlParams.has('error')) {
            handleCallback();
        }
        else {
            setError('Invalid callback - no authorization code received');
        }
    }, [login, navigate]);
    if (error) {
        return (<div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Authentication Failed
          </h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button onClick={() => navigate('/auth/login', { replace: true })} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>);
    }
    return (<div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Completing Authentication
        </h2>
        <p className="text-slate-600">Please wait while we sign you in...</p>
      </div>
    </div>);
};
exports.default = AuthCallback;
