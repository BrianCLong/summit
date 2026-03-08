"use strict";
/**
 * TokenMeter - Real-time token counting widget
 * Shows live token count and cost estimates for prompt editors
 */
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
exports.TokenMeter = TokenMeter;
exports.SimpleTokenMeter = SimpleTokenMeter;
exports.TokenMeterWithEnforcement = TokenMeterWithEnforcement;
const react_1 = __importStar(require("react"));
const lodash_1 = require("lodash");
function TokenMeter({ provider, model, text, completion, showCost = true, showWarnings = true, className = '', onBudgetChange, }) {
    const [count, setCount] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // Debounced token counting to avoid excessive API calls
    const debouncedCount = (0, react_1.useMemo)(() => (0, lodash_1.debounce)(async (provider, model, text, completion) => {
        if (!model || !text.trim()) {
            setCount(null);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/tokcount', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider,
                    model,
                    prompt: text,
                    completion,
                }),
            });
            if (!response.ok) {
                throw new Error(`Token counting failed: ${response.status}`);
            }
            const result = await response.json();
            setCount(result);
            // Notify parent of budget status change
            if (onBudgetChange && result.budget) {
                onBudgetChange(result.budget.recommendAction);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            // Fallback estimation
            const estimatedTokens = Math.max(1, Math.round(text.length / 4));
            setCount({
                model,
                prompt: estimatedTokens,
                completion: completion
                    ? Math.round(completion.length / 4)
                    : undefined,
                total: estimatedTokens +
                    (completion ? Math.round(completion.length / 4) : 0),
                estimatedCostUSD: 0,
            });
        }
        finally {
            setLoading(false);
        }
    }, 500), [onBudgetChange]);
    (0, react_1.useEffect)(() => {
        debouncedCount(provider, model, text, completion);
        return () => {
            debouncedCount.cancel();
        };
    }, [provider, model, text, completion, debouncedCount]);
    if (!count) {
        return loading ? (<div className={`text-xs opacity-60 ${className}`}>
        Counting tokens...
      </div>) : null;
    }
    const getBudgetColor = () => {
        if (!count.budget)
            return 'text-gray-500';
        switch (count.budget.recommendAction) {
            case 'block':
                return 'text-red-600';
            case 'warn':
                return 'text-yellow-600';
            default:
                return 'text-green-600';
        }
    };
    const getBudgetIcon = () => {
        if (!count.budget)
            return null;
        switch (count.budget.recommendAction) {
            case 'block':
                return '🚫';
            case 'warn':
                return '⚠️';
            default:
                return '✅';
        }
    };
    return (<div className={`flex items-center gap-2 text-xs ${getBudgetColor()} ${className}`}>
      {loading && <span className="animate-pulse">⏳</span>}

      {getBudgetIcon() && <span>{getBudgetIcon()}</span>}

      <span>{count.total.toLocaleString()} tokens</span>

      {count.completion && (<span className="opacity-75">
          ({count.prompt.toLocaleString()} + {count.completion.toLocaleString()}
          )
        </span>)}

      {showCost && count.estimatedCostUSD && count.estimatedCostUSD > 0 && (<span className="opacity-75">
          ≈ ${count.estimatedCostUSD.toFixed(4)}
        </span>)}

      {showWarnings && count.budget && count.budget.percentUsed > 0 && (<span className="opacity-75">
          ({count.budget.percentUsed.toFixed(1)}% of budget)
        </span>)}

      {error && (<span className="text-red-500 opacity-75" title={error}>
          (estimated)
        </span>)}
    </div>);
}
/**
 * Simplified token meter for basic use cases
 */
function SimpleTokenMeter({ text, model = 'gpt-4o-mini', }) {
    return (<TokenMeter model={model} text={text} showCost={false} showWarnings={false} className="text-gray-500"/>);
}
/**
 * Token meter with budget enforcement for critical operations
 */
function TokenMeterWithEnforcement({ text, model, onBlock, }) {
    return (<TokenMeter model={model} text={text} showCost={true} showWarnings={true} onBudgetChange={(status) => {
            if (status === 'block' && onBlock) {
                onBlock();
            }
        }}/>);
}
