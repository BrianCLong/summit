import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';

interface PolicyDecision {
  allow: boolean;
  reason?: string;
  matchedRules?: string[];
  missingAttributes?: string[];
}

export const PolicyExplanationPanel: React.FC<{ decision: PolicyDecision }> = ({ decision }) => {
  return (
    <Card className={`w-full border-l-4 ${decision.allow ? 'border-l-green-500' : 'border-l-red-500'}`}>
      <CardHeader>
        <CardTitle className="text-sm">Policy Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={decision.allow ? 'default' : 'destructive'}>
          <AlertTitle>{decision.allow ? 'Allowed' : 'Denied'}</AlertTitle>
          <AlertDescription>{decision.reason || (decision.allow ? 'Policy checks passed.' : 'Policy checks failed.')}</AlertDescription>
        </Alert>

        {decision.matchedRules && decision.matchedRules.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1">Matched Rules:</div>
            <ul className="list-disc list-inside text-xs">
              {decision.matchedRules.map(rule => <li key={rule}>{rule}</li>)}
            </ul>
          </div>
        )}

        {decision.missingAttributes && decision.missingAttributes.length > 0 && (
          <div>
             <div className="text-xs font-semibold mb-1 text-red-500">Missing Attributes:</div>
             <ul className="list-disc list-inside text-xs text-red-500">
               {decision.missingAttributes.map(attr => <li key={attr}>{attr}</li>)}
             </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
