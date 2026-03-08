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
exports.AgentHealthDashboard = void 0;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const progress_1 = require("@/components/ui/progress");
const AgentHealthDashboard = () => {
    const [agents, setAgents] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        // Mock fetch
        const fetchAgents = async () => {
            // const res = await fetch('/api/meta-orchestrator/agents');
            // const data = await res.json();
            // setAgents(data);
            // Mock data for display
            setAgents([
                {
                    id: 'agent-1',
                    name: 'Research Agent Alpha',
                    role: 'Researcher',
                    status: 'BUSY',
                    health: { cpuUsage: 45, memoryUsage: 1024, lastHeartbeat: new Date().toISOString(), activeTasks: 2 }
                },
                {
                    id: 'agent-2',
                    name: 'Reviewer Bot',
                    role: 'Reviewer',
                    status: 'IDLE',
                    health: { cpuUsage: 5, memoryUsage: 512, lastHeartbeat: new Date().toISOString(), activeTasks: 0 }
                },
                {
                    id: 'agent-3',
                    name: 'Synthesis Engine',
                    role: 'Writer',
                    status: 'OFFLINE',
                    health: { cpuUsage: 0, memoryUsage: 0, lastHeartbeat: new Date(Date.now() - 3600000).toISOString(), activeTasks: 0 }
                }
            ]);
        };
        fetchAgents();
        const interval = setInterval(fetchAgents, 5000);
        return () => clearInterval(interval);
    }, []);
    const getStatusColor = (status) => {
        switch (status) {
            case 'IDLE': return 'bg-green-500';
            case 'BUSY': return 'bg-blue-500';
            case 'OFFLINE': return 'bg-slate-500';
            case 'ERROR': return 'bg-red-500';
            default: return 'bg-slate-500';
        }
    };
    return (<div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Agent Health Monitor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => (<Card_1.Card key={agent.id}>
                <Card_1.CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Card_1.CardTitle className="text-lg font-medium">
                        {agent.name}
                    </Card_1.CardTitle>
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(agent.status)}`} title={agent.status}/>
                </Card_1.CardHeader>
                <Card_1.CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Role:</span>
                            <span className="font-medium text-foreground">{agent.role}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Active Tasks:</span>
                            <span className="font-medium text-foreground">{agent.health.activeTasks}</span>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>CPU Usage</span>
                                <span>{agent.health.cpuUsage}%</span>
                            </div>
                            <progress_1.Progress value={agent.health.cpuUsage} className="h-2"/>
                        </div>

                         <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Memory (MB)</span>
                                <span>{agent.health.memoryUsage}</span>
                            </div>
                            <progress_1.Progress value={(agent.health.memoryUsage / 2048) * 100} className="h-2"/>
                        </div>

                        <div className="text-xs text-muted-foreground pt-2">
                            Last heartbeat: {new Date(agent.health.lastHeartbeat).toLocaleTimeString()}
                        </div>
                    </div>
                </Card_1.CardContent>
            </Card_1.Card>))}
      </div>
    </div>);
};
exports.AgentHealthDashboard = AgentHealthDashboard;
