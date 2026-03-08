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
exports.CrossDomainTransferButton = CrossDomainTransferButton;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const Button_1 = require("@/components/ui/Button");
const Dialog_1 = require("@/components/ui/Dialog");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const select_1 = require("@/components/ui/select");
function CrossDomainTransferButton({ entityId, currentDomain, onTransferComplete, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [targetDomain, setTargetDomain] = (0, react_1.useState)('');
    const [justification, setJustification] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
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
            if (onTransferComplete)
                onTransferComplete();
            alert('Transfer Successful. Transfer ID: ' + data.transferId);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    return (<Dialog_1.Dialog open={open} onOpenChange={setOpen}>
      <Dialog_1.DialogTrigger asChild>
        <Button_1.Button variant="outline" className="ml-2 bg-amber-900/20 text-amber-500 border-amber-900/50 hover:bg-amber-900/30">
          Transfer Domain
        </Button_1.Button>
      </Dialog_1.DialogTrigger>
      <Dialog_1.DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-slate-100">
        <Dialog_1.DialogHeader>
          <Dialog_1.DialogTitle>Cross-Domain Transfer</Dialog_1.DialogTitle>
          <Dialog_1.DialogDescription className="text-slate-400">
            Move this entity to another security domain. This action is audited.
          </Dialog_1.DialogDescription>
        </Dialog_1.DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label_1.Label htmlFor="domain" className="text-right text-slate-300">
              Target
            </label_1.Label>
            <select_1.Select onValueChange={setTargetDomain} value={targetDomain}>
              <select_1.SelectTrigger className="col-span-3 bg-slate-800 border-slate-600">
                <select_1.SelectValue placeholder="Select domain"/>
              </select_1.SelectTrigger>
              <select_1.SelectContent className="bg-slate-800 border-slate-600">
                {domains.map((d) => (<select_1.SelectItem key={d.id} value={d.id} className="text-slate-200 focus:bg-slate-700">
                    {d.name}
                  </select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label_1.Label htmlFor="justification" className="text-right text-slate-300">
              Justification
            </label_1.Label>
            <input_1.Input id="justification" value={justification} onChange={(e) => setJustification(e.target.value)} className="col-span-3 bg-slate-800 border-slate-600 text-slate-200" placeholder="Mission requirement..."/>
          </div>
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}
        </div>
        <Dialog_1.DialogFooter>
          <Button_1.Button type="submit" onClick={handleTransfer} disabled={!targetDomain || !justification || loading} className="bg-amber-600 hover:bg-amber-700 text-white">
            {loading ? 'Transferring...' : 'Execute Transfer'}
          </Button_1.Button>
        </Dialog_1.DialogFooter>
      </Dialog_1.DialogContent>
    </Dialog_1.Dialog>);
}
