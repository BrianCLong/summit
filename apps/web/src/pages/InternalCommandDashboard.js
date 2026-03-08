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
const react_1 = __importStar(require("react"));
const Panels_1 = require("@/components/internal-command/Panels");
const Badge_1 = require("@/components/ui/Badge");
const AuthContext_1 = require("@/contexts/AuthContext");
const InternalCommandDashboard = () => {
    const { user } = (0, AuthContext_1.useAuth)();
    const [data, setData] = (0, react_1.useState)({
        governance: null,
        agents: null,
        ci: null,
        releases: null,
        zk: null,
        streaming: null,
        ga: null,
    });
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [globalStatus, setGlobalStatus] = (0, react_1.useState)('green');
    (0, react_1.useEffect)(() => {
        const fetchData = async () => {
            try {
                const endpoints = [
                    'governance',
                    'agents',
                    'ci',
                    'releases',
                    'zk',
                    'streaming',
                    'ga'
                ];
                const token = localStorage.getItem('auth_token');
                const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
                const results = await Promise.all(endpoints.map(async (key) => {
                    try {
                        const res = await fetch(`/api/internal/${key}/status`, { headers });
                        if (!res.ok)
                            throw new Error(`Failed to fetch ${key}`);
                        return { key, data: await res.json() };
                    }
                    catch (e) {
                        console.error(e);
                        return { key, data: null }; // Fail closed
                    }
                }));
                const newData = {};
                let worstStatus = 'green';
                const priority = { red: 3, yellow: 2, green: 1 };
                results.forEach(({ key, data }) => {
                    newData[key] = data;
                    if (data) {
                        if (priority[data.status] > priority[worstStatus]) {
                            worstStatus = data.status;
                        }
                    }
                });
                setData(newData);
                setGlobalStatus(worstStatus);
            }
            catch (e) {
                console.error("Global fetch error", e);
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);
    const bannerColor = {
        green: 'bg-green-600',
        yellow: 'bg-yellow-500',
        red: 'bg-red-600',
    }[globalStatus];
    return (<div className="min-h-screen bg-gray-50/50 p-6 space-y-6">
      {/* Global Status Banner */}
      <div className={`rounded-lg ${bannerColor} p-4 text-white shadow-md flex items-center justify-between`}>
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold tracking-tight">SUMMIT COMMAND DASHBOARD</h1>
          <Badge_1.Badge variant="outline" className="bg-white/20 text-white border-none">
            Status: {globalStatus.toUpperCase()}
          </Badge_1.Badge>
        </div>
        <div className="font-mono text-sm opacity-90">
            Release: stable@a1b2c3
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1 */}
        <Panels_1.GovernancePanel data={data.governance} loading={loading}/>
        <Panels_1.AgentControlPanel data={data.agents} loading={loading}/>
        <Panels_1.CIStatusPanel data={data.ci} loading={loading}/>

        {/* Row 2 */}
        <Panels_1.ReleasePanel data={data.releases} loading={loading}/>
        <Panels_1.ZKIsolationPanel data={data.zk} loading={loading}/>
        <Panels_1.StreamingPanel data={data.streaming} loading={loading}/>
      </div>

      {/* Row 3 - GA Readiness (Full Width) */}
      <div className="grid grid-cols-1">
         <Panels_1.GAReadinessPanel data={data.ga} loading={loading}/>
      </div>
    </div>);
};
exports.default = InternalCommandDashboard;
