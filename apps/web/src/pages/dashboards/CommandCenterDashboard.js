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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommandCenterDashboard;
const react_1 = __importStar(require("react"));
const KPIStrip_1 = require("@/components/panels/KPIStrip");
const EROpsPanel_1 = require("@/components/panels/EROpsPanel");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const DataIntegrityNotice_1 = require("@/components/common/DataIntegrityNotice");
const DemoIndicator_1 = require("@/components/common/DemoIndicator");
const data_json_1 = __importDefault(require("@/mock/data.json"));
function CommandCenterDashboard() {
    const [kpiMetrics, setKpiMetrics] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const isDemoMode = (0, DemoIndicator_1.useDemoMode)();
    (0, react_1.useEffect)(() => {
        const loadData = async () => {
            if (!isDemoMode) {
                setKpiMetrics([]);
                setLoading(false);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            setKpiMetrics(data_json_1.default.kpiMetrics);
            setLoading(false);
        };
        loadData();
    }, [isDemoMode]);
    const commandCenterMetrics = [
        ...kpiMetrics,
        ...(isDemoMode
            ? [
                {
                    id: 'live_threats',
                    title: 'Live Threats',
                    value: 7,
                    format: 'number',
                    status: 'warning',
                },
                {
                    id: 'response_rate',
                    title: 'Response Rate',
                    value: 94,
                    format: 'percentage',
                    status: 'success',
                },
            ]
            : []),
    ];
    return (<div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Command Center</h1>
          <p className="text-muted-foreground">
            Intelligence operations dashboard
          </p>
        </div>
        {isDemoMode ? (<Badge_1.Badge variant="warning">Demo</Badge_1.Badge>) : (<Badge_1.Badge variant="secondary">Disconnected</Badge_1.Badge>)}
      </div>

      <DataIntegrityNotice_1.DataIntegrityNotice mode={isDemoMode ? 'demo' : 'unavailable'} context="Command center"/>

      <KPIStrip_1.KPIStrip data={commandCenterMetrics} loading={loading} columns={6} className="cyber-glow"/>

      <EROpsPanel_1.EROpsPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card_1.Card className="intel-gradient text-white">
          <Card_1.CardHeader>
            <Card_1.CardTitle className="text-white">🚨 Threat Radar</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Critical Alerts</span>
                <Badge_1.Badge variant="destructive">2</Badge_1.Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>High Priority</span>
                <Badge_1.Badge variant="warning">5</Badge_1.Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Monitoring</span>
                <Badge_1.Badge variant="secondary">12</Badge_1.Badge>
              </div>
            </div>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>📊 Analysis Pipeline</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Processing Queue</span>
                <span className="font-bold">3</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Today</span>
                <span className="font-bold">127</span>
              </div>
              <div className="flex justify-between">
                <span>AI Confidence</span>
                <span className="font-bold">87%</span>
              </div>
            </div>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>🌐 Network Status</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Data Sources</span>
                <Badge_1.Badge variant="success">12/12</Badge_1.Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>API Health</span>
                <Badge_1.Badge variant="success">Operational</Badge_1.Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Last Sync</span>
                <span className="text-sm text-muted-foreground">2 min ago</span>
              </div>
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>
    </div>);
}
