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
exports.useAuth = useAuth;
exports.AuthProvider = AuthProvider;
const react_1 = __importStar(require("react"));
const AuthContext = (0, react_1.createContext)(undefined);
function useAuth() {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
function AuthProvider({ children }) {
    const [user, setUser] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        let isMounted = true;
        const restoreSession = async () => {
            await fetchCurrentUser(() => isMounted);
        };
        restoreSession();
        return () => {
            isMounted = false;
        };
    }, []);
    const fetchCurrentUser = async (isMountedRef = () => true) => {
        const token = localStorage.getItem('auth_token');
        try {
            const response = await fetch('/users/me', {
                credentials: 'include',
                headers: token
                    ? {
                        Authorization: `Bearer ${token}`,
                    }
                    : undefined,
            });
            if (!isMountedRef()) {
                return;
            }
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            }
            else if (token &&
                (response.status === 401 || response.status === 403)) {
                localStorage.removeItem('auth_token');
            }
        }
        catch (error) {
            if (isMountedRef()) {
                console.error('Failed to fetch current user:', error);
            }
        }
        finally {
            if (isMountedRef()) {
                setLoading(false);
            }
        }
    };
    const login = async (email, password) => {
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });
            if (response.ok) {
                const { token, user: userData } = await response.json();
                localStorage.setItem('auth_token', token);
                setUser(userData);
            }
            else {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }
        }
        catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };
    const logout = async () => {
        try {
            await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
        }
        catch (error) {
            console.error('Logout error:', error);
        }
        finally {
            localStorage.removeItem('auth_token');
            setUser(null);
        }
    };
    const value = {
        user,
        token: localStorage.getItem('auth_token'),
        loading,
        login,
        logout,
        isAuthenticated: Boolean(user),
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
