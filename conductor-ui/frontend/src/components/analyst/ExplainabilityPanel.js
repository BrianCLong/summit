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
exports.ExplainabilityPanel = void 0;
const react_1 = __importStar(require("react"));
const alert_1 = require("../ui/alert");
const ExplainabilityPanel = ({ policyOutcome, queryContext, }) => {
    const [expanded, setExpanded] = (0, react_1.useState)(false);
    const [explanation, setExplanation] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (policyOutcome && policyOutcome.decision === 'deny') {
            generateExplanation(policyOutcome);
        }
    }, [policyOutcome]);
    const generateExplanation = async (outcome) => {
        // Call explainability endpoint
        try {
            const response = await fetch('/api/policy/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    outcome,
                    context: queryContext,
                }),
            });
            const result = await response.json();
            setExplanation(result.explanation);
        }
        catch (error) {
            setExplanation('Unable to generate explanation');
        }
    };
    if (!policyOutcome) {
        return null;
    }
    const isBlocked = policyOutcome.decision === 'deny';
    return (<div className="explainability-panel mt-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">
          {isBlocked ? '🚫 Why was this blocked?' : '✅ Policy Check Passed'}
        </h3>
        <button onClick={() => setExpanded(!expanded)} className="text-sm text-blue-600 hover:text-blue-800">
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <alert_1.Alert className={isBlocked
            ? 'border-red-500 bg-red-50'
            : 'border-green-500 bg-green-50'}>
        <alert_1.AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">{policyOutcome.reason}</div>

            {isBlocked && policyOutcome.remediation && (<div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                <div className="font-semibold text-amber-800">
                  How to proceed:
                </div>
                <div className="text-sm text-amber-700">
                  {policyOutcome.remediation}
                </div>
              </div>)}
          </div>
        </alert_1.AlertDescription>
      </alert_1.Alert>

      {expanded && (<div className="mt-4 space-y-3">
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">
              Rule Details
            </h4>
            <div className="text-sm">
              <div>
                <strong>Rule ID:</strong> {policyOutcome.rule_id}
              </div>
              <div>
                <strong>Decision:</strong>{' '}
                {policyOutcome.decision.toUpperCase()}
              </div>
            </div>
          </div>

          {policyOutcome.evidence && policyOutcome.evidence.length > 0 && (<div className="bg-gray-50 p-3 rounded">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">
                Evidence
              </h4>
              <ul className="text-sm list-disc list-inside space-y-1">
                {policyOutcome.evidence.map((item, index) => (<li key={index}>{item}</li>))}
              </ul>
            </div>)}

          {explanation && (<div className="bg-blue-50 p-3 rounded border border-blue-200">
              <h4 className="font-semibold text-sm text-blue-800 mb-2">
                AI Explanation
              </h4>
              <div className="text-sm text-blue-700">{explanation}</div>
            </div>)}

          {queryContext && (<details className="bg-gray-50 p-3 rounded">
              <summary className="font-semibold text-sm text-gray-700 cursor-pointer">
                Query Context
              </summary>
              <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                {JSON.stringify(queryContext, null, 2)}
              </pre>
            </details>)}
        </div>)}
    </div>);
};
exports.ExplainabilityPanel = ExplainabilityPanel;
