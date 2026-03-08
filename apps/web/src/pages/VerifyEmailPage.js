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
exports.default = VerifyEmailPage;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
function VerifyEmailPage() {
    const [searchParams] = (0, react_router_dom_1.useSearchParams)();
    const token = searchParams.get('token');
    const [status, setStatus] = (0, react_1.useState)('verifying');
    const [message, setMessage] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided.');
            return;
        }
        const verify = async () => {
            try {
                const response = await fetch('/auth/verify-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || data.error || 'Verification failed');
                }
                setStatus('success');
            }
            catch (err) {
                setStatus('error');
                setMessage(err instanceof Error ? err.message : 'Verification failed');
            }
        };
        verify();
    }, [token]);
    if (!token) {
        return <react_router_dom_1.Navigate to="/signin" replace/>;
    }
    return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <Card_1.Card className="glass-morphism border-blue-500/20 w-full max-w-md">
        <Card_1.CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 flex items-center justify-center mb-4">
            {status === 'verifying' && (<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>)}
            {status === 'success' && (<lucide_react_1.CheckCircle className="h-16 w-16 text-green-500"/>)}
            {status === 'error' && (<lucide_react_1.XCircle className="h-16 w-16 text-red-500"/>)}
          </div>
          <Card_1.CardTitle className="text-white text-2xl">
            {status === 'verifying' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent className="text-center space-y-6">
          <p className="text-blue-200">
            {status === 'verifying' && 'Please wait while we verify your email address.'}
            {status === 'success' && 'Your account has been successfully verified. You can now access the platform.'}
            {status === 'error' && (message || 'The verification link is invalid or has expired.')}
          </p>

          <div className="pt-4">
            {status === 'success' && (<react_router_dom_1.Link to="/signin">
                <Button_1.Button className="w-full bg-green-600 hover:bg-green-700">
                  Continue to Sign In <lucide_react_1.ArrowRight className="ml-2 h-4 w-4"/>
                </Button_1.Button>
              </react_router_dom_1.Link>)}
            {status === 'error' && (<div className="space-y-3">
                <react_router_dom_1.Link to="/signup">
                  <Button_1.Button variant="outline" className="w-full text-white border-white/20 hover:bg-white/10">
                    Register Again
                  </Button_1.Button>
                </react_router_dom_1.Link>
                <div className="text-sm text-slate-400">
                  <react_router_dom_1.Link to="/signin" className="hover:text-white">
                    Back to Sign In
                  </react_router_dom_1.Link>
                </div>
              </div>)}
          </div>
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
}
