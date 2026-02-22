import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface Receipt {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  resource: string;
  inputHash: string;
  policyDecisionId?: string;
  signature: string;
  signerKeyId: string;
}

export const ReceiptPanel: React.FC<{ receipt: Receipt }> = ({ receipt }) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-mono flex items-center gap-2">
          <span>🧾 Provenance Receipt</span>
          <Badge variant="outline">{receipt.id.slice(0, 8)}...</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs font-mono space-y-2">
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <div className="text-muted-foreground">Timestamp:</div>
          <div>{receipt.timestamp}</div>
          <div className="text-muted-foreground">Action:</div>
          <div>{receipt.action}</div>
          <div className="text-muted-foreground">Actor:</div>
          <div>{receipt.actor}</div>
          <div className="text-muted-foreground">Resource:</div>
          <div>{receipt.resource}</div>
          <div className="text-muted-foreground">Signature:</div>
          <div className="truncate" title={receipt.signature}>{receipt.signature}</div>
        </div>
        <div className="pt-2 border-t mt-2">
           <div className="text-green-600 flex items-center gap-1">
             <span>✓ Cryptographically Verifiable</span>
           </div>
        </div>
      </CardContent>
    </Card>
  );
};
