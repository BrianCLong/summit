"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalStatusBanner = GlobalStatusBanner;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const Alert_1 = require("@/components/ui/Alert");
const Button_1 = require("@/components/ui/Button");
const CommandStatusProvider_1 = require("../CommandStatusProvider");
const utils_1 = require("@/lib/utils");
function GlobalStatusBanner() {
    const { state, refresh } = (0, CommandStatusProvider_1.useCommandStatusContext)();
    const icon = state.banner.level === 'green' ? (<lucide_react_1.CheckCircle2 className="h-5 w-5"/>) : state.banner.level === 'yellow' ? (<lucide_react_1.AlertTriangle className="h-5 w-5"/>) : (<lucide_react_1.AlertTriangle className="h-5 w-5"/>);
    return (<Alert_1.Alert variant={state.banner.level === 'red' ? 'destructive' : state.banner.level === 'yellow' ? 'warning' : 'default'} className={(0, utils_1.cn)('rounded-none border-x-0 border-t border-b shadow-sm', state.banner.level === 'green' && 'bg-emerald-50 text-emerald-900', state.banner.level === 'yellow' && 'bg-amber-50 text-amber-900')}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-xl">{icon}</div>
          <div>
            <Alert_1.AlertTitle className="flex items-center gap-2 text-base">{state.banner.headline}</Alert_1.AlertTitle>
            <Alert_1.AlertDescription className="text-sm">{state.banner.detail}</Alert_1.AlertDescription>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {state.loading && <lucide_react_1.Loader2 className="h-4 w-4 animate-spin" aria-label="Refreshing"/>}
          <Button_1.Button variant="outline" size="sm" onClick={refresh}>
            Refresh
          </Button_1.Button>
        </div>
      </div>
    </Alert_1.Alert>);
}
