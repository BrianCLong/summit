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
exports.WarRoom = void 0;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const WarRoom = () => {
    const [kpis, setKpis] = (0, react_1.useState)([]);
    const [risks, setRisks] = (0, react_1.useState)([]);
    const [lastUpdated, setLastUpdated] = (0, react_1.useState)(new Date());
    const refreshData = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/summitsight/warroom`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setKpis(data.kpis || []);
            setRisks(data.risks || []);
            setLastUpdated(new Date());
        }
        catch (e) {
            console.error(e);
        }
    };
    (0, react_1.useEffect)(() => {
        refreshData();
        const interval = setInterval(refreshData, 5000); // 5s refresh
        return () => clearInterval(interval);
    }, []);
    return (<div className="bg-slate-950 min-h-screen text-slate-50 p-6 font-mono">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                    <lucide_react_1.ShieldAlert className="text-red-500 w-8 h-8"/>
                    <h1 className="text-2xl font-bold tracking-widest uppercase text-red-500">
                        Summitsight War Room
                    </h1>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        LIVE
                    </div>
                    <div>LAST UPDATE: {lastUpdated.toLocaleTimeString()}</div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Critical Metrics Column */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase mb-2">Critical Telemetry</h2>
                    <div className="grid gap-4">
                        {kpis.map((k) => (<div key={k.definition.kpi_id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase">{k.definition.name}</div>
                                <div className={`text-4xl font-bold mt-1 ${k.status === 'red' ? 'text-red-500' : 'text-green-500'}`}>
                                    {k.currentValue?.toFixed(1) ?? '-'} <span className="text-sm text-slate-600">{k.definition.unit}</span>
                                </div>
                            </div>))}
                    </div>
                </div>

                {/* Risk Radar Column */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase mb-2">Risk Assessment</h2>
                    {risks.map((r, i) => (<Card_1.Card key={i} className="bg-slate-900 border-red-900/30 border text-slate-300">
                            <Card_1.CardHeader className="py-3">
                                <Card_1.CardTitle className="text-sm font-bold uppercase text-red-400 flex items-center gap-2">
                                    <lucide_react_1.AlertTriangle className="w-4 h-4"/>
                                    {r.risk_category}
                                </Card_1.CardTitle>
                            </Card_1.CardHeader>
                            <Card_1.CardContent>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs text-slate-500">Threat Score</span>
                                    <span className="text-2xl font-bold text-slate-100">{r.risk_score}/100</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-orange-500 to-red-600 h-full" style={{ width: `${r.risk_score}%` }}/>
                                </div>
                                <div className="mt-3 text-xs font-mono text-slate-500">
                                    {JSON.stringify(r.factors, null, 2)}
                                </div>
                            </Card_1.CardContent>
                        </Card_1.Card>))}
                </div>

                {/* Activity Log (Simulated) */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-full">
                     <h2 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <lucide_react_1.Activity className="w-4 h-4"/> Live Events
                    </h2>
                    <ul className="space-y-3 text-xs font-mono text-slate-300">
                        <li className="flex gap-2">
                            <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                            <span>System heartbeat normal.</span>
                        </li>
                        <li className="flex gap-2 text-yellow-500">
                            <span className="text-slate-600">[{new Date(Date.now() - 5000).toLocaleTimeString()}]</span>
                            <span>Warning: Latency spike detected in eu-west-1.</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-slate-600">[{new Date(Date.now() - 15000).toLocaleTimeString()}]</span>
                            <span>Metrics aggregation completed.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>);
};
exports.WarRoom = WarRoom;
