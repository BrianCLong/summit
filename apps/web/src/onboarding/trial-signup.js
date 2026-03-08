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
exports.default = TrialSignup;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
function TrialSignup() {
    const [step, setStep] = (0, react_1.useState)('start');
    const [progress, setProgress] = (0, react_1.useState)(0);
    const handleStartTrial = () => {
        setStep('provisioning');
        // Simulate tenant provision
        let p = 0;
        const interval = setInterval(() => {
            p += 5;
            setProgress(p);
            if (p >= 100) {
                clearInterval(interval);
                setStep('scanning');
                startScan();
            }
        }, 100);
    };
    const startScan = () => {
        setProgress(0);
        let p = 0;
        const interval = setInterval(() => {
            p += 10;
            setProgress(p);
            if (p >= 100) {
                clearInterval(interval);
                setStep('ready');
            }
        }, 200);
    };
    return (<div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Start Your Summit Trial</h1>
            <p className="text-slate-400 text-lg">
              Get full access to the intelligence graph for 7 days.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <lucide_react_1.Shield className="h-6 w-6 text-blue-500 mt-1"/>
              <div>
                <h3 className="text-white font-semibold">1 Organization Limit</h3>
                <p className="text-slate-500 text-sm">Perfect for testing your core mesh.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <lucide_react_1.Clock className="h-6 w-6 text-blue-500 mt-1"/>
              <div>
                <h3 className="text-white font-semibold">7 Day Duration</h3>
                <p className="text-slate-500 text-sm">Full feature access during the trial period.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <lucide_react_1.Globe className="h-6 w-6 text-blue-500 mt-1"/>
              <div>
                <h3 className="text-white font-semibold">Watermarked Graphs</h3>
                <p className="text-slate-500 text-sm">Exportable insights with trial attribution.</p>
              </div>
            </div>
          </div>
        </div>

        <Card_1.Card className="bg-slate-900 border-slate-800 text-white">
          <Card_1.CardHeader>
            <Card_1.CardTitle>Register via GitHub</Card_1.CardTitle>
            <Card_1.CardDescription className="text-slate-400">
              We'll use your GitHub identity to provision your trial environment.
            </Card_1.CardDescription>
          </Card_1.CardHeader>
          <Card_1.CardContent className="space-y-6">
            {step === 'start' && (<Button_1.Button onClick={handleStartTrial} className="w-full h-12 bg-white text-black hover:bg-slate-200 flex items-center justify-center space-x-2">
                <lucide_react_1.Github className="h-5 w-5"/>
                <span>Continue with GitHub</span>
              </Button_1.Button>)}

            {(step === 'provisioning' || step === 'scanning') && (<div className="space-y-4 py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <div>
                  <h3 className="text-lg font-medium">
                    {step === 'provisioning' ? 'Provisioning Tenant...' : 'Org Mesh Quickstart Scan...'}
                  </h3>
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-4">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </div>)}

            {step === 'ready' && (<div className="space-y-4 py-4 text-center">
                <div className="bg-green-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                  <lucide_react_1.CheckCircle2 className="h-10 w-10 text-green-500"/>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Your Environment is Ready!</h3>
                  <p className="text-slate-400 mt-2">
                    Your trial environment has been successfully provisioned.
                  </p>
                </div>
                <Button_1.Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => window.location.href = '/'}>
                  <lucide_react_1.Rocket className="h-4 w-4 mr-2"/>
                  Enter Workspace
                </Button_1.Button>
              </div>)}
          </Card_1.CardContent>
          <Card_1.CardFooter>
            <p className="text-xs text-slate-500 text-center w-full">
              By continuing, you agree to Summit's Trial Terms of Service.
            </p>
          </Card_1.CardFooter>
        </Card_1.Card>
      </div>
    </div>);
}
