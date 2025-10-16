import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '../ui/alert';

interface PolicyOutcome {
  decision: 'allow' | 'deny';
  reason: string;
  rule_id: string;
  evidence?: string[];
  remediation?: string;
}

interface ExplainabilityPanelProps {
  policyOutcome: PolicyOutcome | null;
  queryContext?: any;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  policyOutcome,
  queryContext,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    if (policyOutcome && policyOutcome.decision === 'deny') {
      generateExplanation(policyOutcome);
    }
  }, [policyOutcome]);

  const generateExplanation = async (outcome: PolicyOutcome) => {
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
    } catch (error) {
      setExplanation('Unable to generate explanation');
    }
  };

  if (!policyOutcome) {
    return null;
  }

  const isBlocked = policyOutcome.decision === 'deny';

  return (
    <div className="explainability-panel mt-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">
          {isBlocked ? '🚫 Why was this blocked?' : '✅ Policy Check Passed'}
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <Alert
        className={
          isBlocked
            ? 'border-red-500 bg-red-50'
            : 'border-green-500 bg-green-50'
        }
      >
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">{policyOutcome.reason}</div>

            {isBlocked && policyOutcome.remediation && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                <div className="font-semibold text-amber-800">
                  How to proceed:
                </div>
                <div className="text-sm text-amber-700">
                  {policyOutcome.remediation}
                </div>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {expanded && (
        <div className="mt-4 space-y-3">
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

          {policyOutcome.evidence && policyOutcome.evidence.length > 0 && (
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">
                Evidence
              </h4>
              <ul className="text-sm list-disc list-inside space-y-1">
                {policyOutcome.evidence.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {explanation && (
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <h4 className="font-semibold text-sm text-blue-800 mb-2">
                AI Explanation
              </h4>
              <div className="text-sm text-blue-700">{explanation}</div>
            </div>
          )}

          {queryContext && (
            <details className="bg-gray-50 p-3 rounded">
              <summary className="font-semibold text-sm text-gray-700 cursor-pointer">
                Query Context
              </summary>
              <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                {JSON.stringify(queryContext, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
