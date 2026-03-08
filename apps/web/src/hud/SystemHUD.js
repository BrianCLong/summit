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
exports.SystemHUD = SystemHUD;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const useConductorMetrics_1 = require("@/hooks/useConductorMetrics");
const Popover_1 = require("@/components/ui/Popover");
const Dialog_1 = require("@/components/ui/Dialog");
const Badge_1 = require("@/components/ui/Badge");
const separator_1 = require("@/components/ui/separator");
const TrustHealthDashboard_1 = require("@/components/trust/TrustHealthDashboard");
function SystemHUD() {
    console.log('SystemHUD rendering...');
    const { metrics, isLoading, error } = (0, useConductorMetrics_1.useConductorMetrics)({
        timeRange: '1h',
        refreshInterval: 15000,
    });
    console.log('SystemHUD metrics:', metrics, 'isLoading:', isLoading, 'error:', error);
    const { unacknowledgedCount } = (0, useConductorMetrics_1.useConductorAlerts)();
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const [isTrustDashboardOpen, setIsTrustDashboardOpen] = (0, react_1.useState)(false);
    if (isLoading && !metrics) {
        console.log('SystemHUD: loading state');
        return (<div className="flex items-center space-x-2 text-sm text-muted-foreground animate-pulse">
        <lucide_react_1.Activity className="h-4 w-4"/>
        <span>System Syncing...</span>
      </div>);
    }
    if (error) {
        console.log('SystemHUD: error state', error);
        return (<div className="flex items-center space-x-2 text-sm text-red-500">
        <lucide_react_1.AlertTriangle className="h-4 w-4"/>
        <span>System Offline</span>
      </div>);
    }
    // Derived metrics
    const latency = metrics?.routing.avgLatency || 0;
    const activeJobs = metrics?.routing.totalRequests || 0; // Proxy for jobs
    const activeAgents = metrics?.webOrchestration.activeInterfaces || 0;
    const healthScore = metrics?.infrastructure.uptimePercentage || 100;
    // Status determination
    const isHealthy = healthScore > 98 && latency < 500;
    const isDegraded = !isHealthy && (healthScore > 90 || latency < 1000);
    const isCritical = !isHealthy && !isDegraded;
    console.log('SystemHUD: rendering content');
    return (<Popover_1.Popover open={isOpen} onOpenChange={setIsOpen}>
      <Popover_1.PopoverTrigger asChild>
        <button className={`
            flex items-center space-x-3 px-3 py-1.5 rounded-full border text-sm transition-all hover:bg-accent
            ${isHealthy ? 'border-green-200 bg-green-50/50 text-green-700' : ''}
            ${isDegraded ? 'border-yellow-200 bg-yellow-50/50 text-yellow-700' : ''}
            ${isCritical ? 'border-red-200 bg-red-50/50 text-red-700' : ''}
          `}>
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHealthy ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="font-medium">
              {latency.toFixed(0)}ms
            </span>
          </div>

          <separator_1.Separator orientation="vertical" className="h-3"/>

          <div className="flex items-center space-x-1.5">
            <lucide_react_1.Zap className="h-3 w-3"/>
            <span>{activeJobs}</span>
          </div>

          {unacknowledgedCount > 0 && (<>
               <separator_1.Separator orientation="vertical" className="h-3"/>
               <div className="flex items-center space-x-1.5 text-red-600 font-semibold">
                 <lucide_react_1.AlertTriangle className="h-3 w-3"/>
                 <span>{unacknowledgedCount}</span>
               </div>
            </>)}
        </button>
      </Popover_1.PopoverTrigger>
      <Popover_1.PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none">System Status</h4>
            <Badge_1.Badge variant={isHealthy ? 'success' : 'destructive'}>
              {isHealthy ? 'Healthy' : 'Degraded'}
            </Badge_1.Badge>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Latency</span>
                <span className={`text-lg font-bold ${latency > 300 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {latency.toFixed(1)}ms
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Uptime</span>
                <span className="text-lg font-bold">
                  {(metrics?.infrastructure.uptimePercentage || 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Active Agents</span>
                <span className="text-lg font-bold">
                  {activeAgents}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Alerts</span>
                <span className={`text-lg font-bold ${unacknowledgedCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {unacknowledgedCount}
                </span>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <lucide_react_1.Server className="h-3 w-3"/>
                <span>Last synced: {metrics?.routing ? new Date().toLocaleTimeString() : '-'}</span>
              </div>
            </div>

            <Dialog_1.Dialog open={isTrustDashboardOpen} onOpenChange={setIsTrustDashboardOpen}>
              <Dialog_1.DialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors border mt-2">
                  <div className="flex items-center space-x-2">
                    <lucide_react_1.ShieldCheck className="h-4 w-4 text-green-600"/>
                    <span className="text-sm font-medium">Trust Health</span>
                  </div>
                  <Badge_1.Badge variant="outline" className="text-green-600 bg-green-50">94/100</Badge_1.Badge>
                </button>
              </Dialog_1.DialogTrigger>
              <Dialog_1.DialogContent className="max-w-6xl h-[80vh] overflow-y-auto">
                <TrustHealthDashboard_1.TrustHealthDashboard />
              </Dialog_1.DialogContent>
            </Dialog_1.Dialog>
          </div>
        </div>
      </Popover_1.PopoverContent>
    </Popover_1.Popover>);
}
