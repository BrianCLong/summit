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
exports.default = SignInPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const AuthContext_1 = require("@/contexts/AuthContext");
const metrics_1 = require("@/telemetry/metrics");
const activation_1 = require("@/lib/activation");
function SignInPage() {
    const { login, isAuthenticated, loading } = (0, AuthContext_1.useAuth)();
    const [email, setEmail] = (0, react_1.useState)('sarah.chen@intelgraph.com');
    const [password, setPassword] = (0, react_1.useState)('password');
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const [emailFieldError, setEmailFieldError] = (0, react_1.useState)('');
    const [passwordFieldError, setPasswordFieldError] = (0, react_1.useState)('');
    if (isAuthenticated) {
        return <react_router_dom_1.Navigate to="/" replace/>;
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Clear previous error messages (including the global error)
        setError('');
        setEmailFieldError('');
        setPasswordFieldError('');
        setIsLoading(true);
        // Client-side validation
        let hasErrors = false;
        if (!email) {
            setEmailFieldError('Email is required');
            hasErrors = true;
        }
        else if (!/\S+@\S+\.\S+/.test(email)) {
            setEmailFieldError('Please enter a valid email address');
            hasErrors = true;
        }
        if (!password) {
            setPasswordFieldError('Password is required');
            hasErrors = true;
        }
        else if (password.length < 8) {
            setPasswordFieldError('Password must be at least 8 characters');
            hasErrors = true;
        }
        if (hasErrors) {
            setIsLoading(false);
            return;
        }
        try {
            await login(email, password);
            // Track signup/signin as the first step
            (0, metrics_1.trackGoldenPathStep)('signup');
            (0, activation_1.markStepComplete)('signup');
        }
        catch (err) {
            // When login fails, clear field errors but keep the global error
            setEmailFieldError('');
            setPasswordFieldError('');
            setError(err instanceof Error ? err.message : 'Login failed');
        }
        finally {
            setIsLoading(false);
        }
    };
    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>);
    }
    return (<main role="main" aria-label="Sign in" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">
              IG
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">IntelGraph</h1>
          <p className="text-blue-200 mt-2">AI-Powered Intelligence Platform</p>
        </div>

        <Card_1.Card className="glass-morphism border-blue-500/20">
          <Card_1.CardHeader>
            <Card_1.CardTitle className="text-white">Sign In</Card_1.CardTitle>
            <Card_1.CardDescription className="text-blue-200">
              Enter your credentials to access the platform
            </Card_1.CardDescription>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                  Email
                </label>
                <input id="email" type="email" value={email} onChange={(e) => {
            setEmail(e.target.value);
            // Clear field-specific error when user starts typing
            setEmailFieldError('');
        }} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter your email" required aria-describedby="email-error" aria-invalid={!!emailFieldError}/>
                <div id="email-error" className="min-h-[20px] mt-1 text-sm text-red-300">
                  {emailFieldError && <span>{emailFieldError}</span>}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                  Password
                </label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => {
            setPassword(e.target.value);
            // Clear field-specific error when user starts typing
            setPasswordFieldError('');
        }} className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter your password" required minLength={8} aria-describedby="password-error" aria-invalid={!!passwordFieldError}/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/70 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (<lucide_react_1.EyeOff className="h-4 w-4"/>) : (<lucide_react_1.Eye className="h-4 w-4"/>)}
                  </button>
                </div>
                <div id="password-error" className="min-h-[20px] mt-1 text-sm text-red-300">
                  {passwordFieldError && <span>{passwordFieldError}</span>}
                </div>
                <p className="text-xs text-blue-200 mt-1">Must be at least 8 characters long</p>
              </div>

              {error && (<div className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-md p-3">
                  {error}
                </div>)}

              <Button_1.Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? (<>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </>) : (<>
                    <lucide_react_1.LogIn className="h-4 w-4 mr-2"/>
                    Sign In
                  </>)}
              </Button_1.Button>
            </form>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-sm text-blue-200 mb-2">Demo Credentials:</p>
              <div className="text-xs text-blue-300 space-y-1">
                <div>Email: sarah.chen@intelgraph.com</div>
                <div>Password: password</div>
              </div>
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>
    </main>);
}
