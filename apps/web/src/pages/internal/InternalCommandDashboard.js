"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InternalCommandDashboard;
const react_1 = __importDefault(require("react"));
const Panels_1 = require("@/features/internal-command/components/Panels");
const useCommandStatus_1 = require("@/features/internal-command/useCommandStatus");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
function InternalCommandDashboard() {
    const { state, refresh } = (0, useCommandStatus_1.useCommandStatus)();
    return (<div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Summit Internal Command Dashboard</h1>
            <Badge_1.Badge variant="secondary">Read-only</Badge_1.Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Single source of operational truth for leadership. All panels fail closed; evidence links route to canonical artifacts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge_1.Badge variant={state.banner.level === 'red' ? 'destructive' : state.banner.level === 'yellow' ? 'warning' : 'success'}>
            {state.banner.level === 'green' ? '🟢 Nominal' : state.banner.level === 'yellow' ? '🟡 At risk' : '🔴 Critical'}
          </Badge_1.Badge>
          <Button_1.Button variant="outline" onClick={refresh}>
            Force refresh
          </Button_1.Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panels_1.GovernancePanel />
        <Panels_1.AgentControlPanel />
        <Panels_1.CIStatusPanel />
        <Panels_1.ReleasePanel />
        <Panels_1.ZKIsolationPanel />
        <Panels_1.StreamingPanel />
        <Panels_1.GAReadinessPanel />
      </div>
    </div>);
}
