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
exports.ActivationProgressTile = void 0;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const react_router_dom_1 = require("react-router-dom");
const ActivationProgressTile = () => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [steps, setSteps] = (0, react_1.useState)([
        { id: 'signup', label: 'Sign Up', path: '/', completed: true }, // Assumed true if seeing this
        { id: 'tenant_created', label: 'Create Tenant', path: '/admin', completed: false },
        { id: 'first_ingest', label: 'Ingest Data', path: '/datasources', completed: false },
        { id: 'first_export', label: 'Export Report', path: '/reports', completed: false },
    ]);
    (0, react_1.useEffect)(() => {
        const checkProgress = () => {
            const progress = JSON.parse(localStorage.getItem('activation_progress') || '{}');
            setSteps(prev => prev.map(step => ({
                ...step,
                completed: step.id === 'signup' ? true : !!progress[step.id]
            })));
        };
        checkProgress();
        // Listen for storage events to update in real-time if multiple tabs
        window.addEventListener('storage', checkProgress);
        // Custom event for same-tab updates
        window.addEventListener('activation_updated', checkProgress);
        return () => {
            window.removeEventListener('storage', checkProgress);
            window.removeEventListener('activation_updated', checkProgress);
        };
    }, []);
    const nextStep = steps.find(s => !s.completed);
    const completedCount = steps.filter(s => s.completed).length;
    const progressPercent = (completedCount / steps.length) * 100;
    if (completedCount === steps.length)
        return null; // Hide when done
    return (<Card_1.Card className="mb-6 border-blue-500/20 bg-blue-500/5">
      <Card_1.CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Card_1.CardTitle className="text-lg font-medium text-blue-900 dark:text-blue-100">
            Getting Started
          </Card_1.CardTitle>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {Math.round(progressPercent)}% Complete
          </span>
        </div>
        <div className="h-2 w-full bg-blue-200 dark:bg-blue-900 rounded-full mt-2">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}/>
        </div>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((step, idx) => (<div key={step.id} className="flex items-center space-x-2">
                {step.completed ? (<lucide_react_1.CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0"/>) : (<div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs font-medium text-slate-500">
                    {idx + 1}
                  </div>)}
                <span className={`text-sm ${step.completed ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </div>))}
          </div>

          {nextStep && (<div className="flex justify-end pt-2">
              <Button_1.Button size="sm" onClick={() => navigate(nextStep.path)}>
                Continue to {nextStep.label}
                <lucide_react_1.ArrowRight className="ml-2 h-4 w-4"/>
              </Button_1.Button>
            </div>)}
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
};
exports.ActivationProgressTile = ActivationProgressTile;
