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
exports.ContextualNudge = void 0;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const ContextualNudge = ({ stepId, title, description, actionLabel, onAction, }) => {
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // Check if this step is already completed
        const progress = JSON.parse(localStorage.getItem('activation_progress') || '{}');
        if (!progress[stepId]) {
            setIsVisible(true);
        }
    }, [stepId]);
    const handleDismiss = () => {
        setIsVisible(false);
        // Optionally save dismissal state so it doesn't reappear immediately
    };
    if (!isVisible)
        return null;
    return (<div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Card_1.Card className="border-l-4 border-l-yellow-500 shadow-xl">
        <Card_1.CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center text-yellow-600 dark:text-yellow-500">
              <lucide_react_1.Lightbulb className="h-5 w-5 mr-2"/>
              <span className="font-semibold">{title}</span>
            </div>
            <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <lucide_react_1.X className="h-4 w-4"/>
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            {description}
          </p>
          {actionLabel && onAction && (<Button_1.Button size="sm" variant="outline" className="w-full" onClick={onAction}>
              {actionLabel}
            </Button_1.Button>)}
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
};
exports.ContextualNudge = ContextualNudge;
