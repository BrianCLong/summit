
import React from 'react';
import { DecisionContext, DecisionOption } from '../../types/decision';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';

interface DecisionSupportPanelProps {
  context: DecisionContext;
  onOptionSelect: (optionId: string) => void;
  isLoading?: boolean;
}

export const DecisionSupportPanel: React.FC<DecisionSupportPanelProps> = ({
  context,
  onOptionSelect,
  isLoading = false,
}) => {
  const renderOption = (option: DecisionOption) => {
    const isRestricted = option.type === 'RESTRICTED';
    const isRecommended = option.type === 'RECOMMENDED';

    return (
      <div
        key={option.id}
        className={`p-4 mb-3 border rounded-lg transition-all ${
          isRecommended
            ? 'border-blue-500 bg-blue-50/10'
            : isRestricted
            ? 'border-gray-200 opacity-60 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        data-testid={`option-${option.id}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-lg">{option.label}</h4>
              {isRecommended && (
                <Badge variant="default" className="bg-blue-600">Recommended</Badge>
              )}
              {isRestricted && (
                <Badge variant="outline" className="text-gray-500">Restricted</Badge>
              )}
              {option.riskLevel === 'HIGH' && (
                <Badge variant="destructive">High Risk</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {option.description}
            </p>
            {option.constraints.length > 0 && (
              <ul className="text-xs text-amber-600 dark:text-amber-500 list-disc ml-4">
                {option.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </div>
          <Button
            onClick={() => onOptionSelect(option.id)}
            disabled={isRestricted || isLoading}
            variant={isRecommended ? 'default' : 'secondary'}
            size="sm"
          >
            Select
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg" data-testid="decision-panel">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{context.name}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{context.description}</p>
          </div>
          <Badge variant="outline">ID: {context.id}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Evidence & Uncertainty Section */}
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Decision Context & Evidence
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Key Inputs</h4>
              <ul className="space-y-1">
                {context.inputs.map((input, i) => (
                  <li key={i} className="text-sm flex justify-between border-b border-dotted border-gray-300 pb-1">
                    <span className="text-gray-600">{input.label}:</span>
                    <span className="font-mono font-medium">{input.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Confidence & Traceability</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">System Confidence:</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      context.evidence.confidence > 0.7 ? 'bg-green-500' :
                      context.evidence.confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${context.evidence.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono">{(context.evidence.confidence * 100).toFixed(0)}%</span>
              </div>

              <div className="text-xs font-mono text-gray-400 break-all">
                Source: {context.evidence.sourceId}
              </div>
            </div>
          </div>

          {(context.evidence.uncertainties.length > 0 || context.evidence.missingData.length > 0) && (
            <Alert variant="warning" className="bg-amber-50 border-amber-200">
              <div className="text-amber-800 text-sm">
                <strong>Uncertainty Warning:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {context.evidence.uncertainties.map((u, i) => <li key={`u-${i}`}>{u}</li>)}
                  {context.evidence.missingData.map((m, i) => <li key={`m-${i}`}>Missing Data: {m}</li>)}
                </ul>
              </div>
            </Alert>
          )}
        </div>

        {/* Options Section */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Available Actions
          </h3>
          <div className="space-y-2">
            {context.options.map(renderOption)}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t text-xs text-gray-500">
        <p>
          <strong>Disclaimer:</strong> This system provides decision support based on available data.
          Final judgment remains with the human operator. Actions are logged to the Provenance Ledger.
        </p>
      </CardFooter>
    </Card>
  );
};
