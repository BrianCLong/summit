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
exports.PrivacyBudgetDisplay = void 0;
const react_1 = __importStar(require("react"));
const progress_1 = require("@/components/ui/progress");
const Card_1 = require("@/components/ui/Card");
const PrivacyBudgetDisplay = () => {
    const [budget, setBudget] = (0, react_1.useState)({ remaining: 10, total: 10 });
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        // In a real app, fetch from API
        // fetch('/api/privacy/budget').then(...)
        // Mocking for now as per instructions
        setTimeout(() => {
            setBudget({ remaining: 7.5, total: 10.0 });
            setLoading(false);
        }, 500);
    }, []);
    const percentage = (budget.remaining / budget.total) * 100;
    return (<Card_1.Card className="w-[300px]">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="text-sm font-medium">Privacy Budget</Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <div className="space-y-2">
          <progress_1.Progress value={percentage} className={percentage < 20 ? "bg-red-200" : "bg-green-200"}/>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Remaining: ε = {budget.remaining.toFixed(1)}</span>
            <span>Total: ε = {budget.total.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">
            Budget resets in 24h. Heavy queries consume more budget.
          </p>
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
};
exports.PrivacyBudgetDisplay = PrivacyBudgetDisplay;
