import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CrossDomainTransferButtonProps {
  entityId: string;
  currentDomain: string;
  onTransferComplete?: () => void;
}

export function CrossDomainTransferButton({
  entityId,
  currentDomain,
  onTransferComplete,
}: CrossDomainTransferButtonProps) {
  const [open, setOpen] = useState(false);
  const [targetDomain, setTargetDomain] = useState<string>('');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hardcoded for now, could be fetched from API
  const domains = [
    { id: 'high-side', name: 'High Side (TS/SCI)' },
    { id: 'low-side', name: 'Low Side (UNCLASSIFIED)' },
  ].filter((d) => d.id !== currentDomain);

  const handleTransfer = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token'); // Simplistic auth handling
      const response = await fetch('/api/cds/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entityId,
          sourceDomainId: currentDomain,
          targetDomainId: targetDomain,
          justification,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transfer failed');
      }

      setOpen(false);
      if (onTransferComplete) onTransferComplete();
      alert('Transfer Successful. Transfer ID: ' + data.transferId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="ml-2 bg-amber-900/20 text-amber-500 border-amber-900/50 hover:bg-amber-900/30">
          Transfer Domain
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>Cross-Domain Transfer</DialogTitle>
          <DialogDescription className="text-slate-400">
            Move this entity to another security domain. This action is audited.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="domain" className="text-right text-slate-300">
              Target
            </Label>
            <Select onValueChange={setTargetDomain} value={targetDomain}>
              <SelectTrigger className="col-span-3 bg-slate-800 border-slate-600">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-slate-200 focus:bg-slate-700">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="justification" className="text-right text-slate-300">
              Justification
            </Label>
            <Input
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="col-span-3 bg-slate-800 border-slate-600 text-slate-200"
              placeholder="Mission requirement..."
            />
          </div>
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleTransfer}
            disabled={!targetDomain || !justification || loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? 'Transferring...' : 'Execute Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
