"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceBadge = void 0;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const Dialog_1 = require("@/components/ui/Dialog");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const ProvenanceBadge = ({ status, manifestId, className }) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'verified':
                return {
                    icon: <lucide_react_1.ShieldCheck className="w-4 h-4 mr-1"/>,
                    text: 'Verified',
                    variant: 'default', // Map to valid badge variant
                    color: 'bg-green-600'
                };
            case 'tampered':
                return {
                    icon: <lucide_react_1.ShieldAlert className="w-4 h-4 mr-1"/>,
                    text: 'Tampered',
                    variant: 'destructive',
                    color: 'bg-red-600'
                };
            case 'unverified':
            default:
                return {
                    icon: <lucide_react_1.FileSearch className="w-4 h-4 mr-1"/>,
                    text: 'Unverified',
                    variant: 'secondary',
                    color: 'bg-gray-500'
                };
        }
    };
    const config = getStatusConfig();
    return (<Dialog_1.Dialog>
      <Dialog_1.DialogTrigger asChild>
        <Button_1.Button variant="ghost" size="sm" className={`h-6 px-2 ${className}`}>
           <Badge_1.Badge variant={config.variant} className={`flex items-center ${config.color} hover:${config.color}`}>
             {config.icon}
             <span>{config.text}</span>
           </Badge_1.Badge>
        </Button_1.Button>
      </Dialog_1.DialogTrigger>
      <Dialog_1.DialogContent>
        <Dialog_1.DialogHeader>
          <Dialog_1.DialogTitle>Provenance Verification</Dialog_1.DialogTitle>
        </Dialog_1.DialogHeader>
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

          {manifestId && (<div className="border rounded-md p-3 bg-slate-50 text-xs font-mono">
              ID: {manifestId}
            </div>)}

          <div className="text-xs text-muted-foreground mt-4">
             Verification Authority: IntelGraph Prov-Ledger v1.0
          </div>
        </div>
      </Dialog_1.DialogContent>
    </Dialog_1.Dialog>);
};
exports.ProvenanceBadge = ProvenanceBadge;
