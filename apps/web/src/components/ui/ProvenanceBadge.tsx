import React from 'react';
import { ShieldCheck, ShieldAlert, FileSearch } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProvenanceBadgeProps {
  status: 'verified' | 'unverified' | 'tampered';
  manifestId?: string;
  className?: string;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  status,
  manifestId,
  className
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: <ShieldCheck className="w-4 h-4 mr-1" />,
          text: 'Verified',
          variant: 'default' as const, // Map to valid badge variant
          color: 'bg-green-600'
        };
      case 'tampered':
        return {
          icon: <ShieldAlert className="w-4 h-4 mr-1" />,
          text: 'Tampered',
          variant: 'destructive' as const,
          color: 'bg-red-600'
        };
      case 'unverified':
      default:
        return {
          icon: <FileSearch className="w-4 h-4 mr-1" />,
          text: 'Unverified',
          variant: 'secondary' as const,
          color: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={`h-6 px-2 ${className}`}>
           <Badge variant={config.variant} className={`flex items-center ${config.color} hover:${config.color}`}>
             {config.icon}
             <span>{config.text}</span>
           </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provenance Verification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-full ${config.color} bg-opacity-10 text-${config.color}`}>
              {config.icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{config.text}</h3>
              <p className="text-sm text-muted-foreground">
                {status === 'verified'
                  ? 'Cryptographic signature and hash chain match the immutable ledger.'
                  : status === 'tampered'
                  ? 'Data integrity check failed. The content has been modified.'
                  : 'No provenance manifest found for this item.'}
              </p>
            </div>
          </div>

          {manifestId && (
            <div className="border rounded-md p-3 bg-slate-50 text-xs font-mono">
              ID: {manifestId}
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-4">
             Verification Authority: IntelGraph Prov-Ledger v1.0
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
