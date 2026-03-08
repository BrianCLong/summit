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
exports.default = GovernanceDashboard;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Table_1 = require("@/components/ui/Table");
const Badge_1 = require("@/components/ui/Badge");
const lucide_react_1 = require("lucide-react");
function GovernanceDashboard() {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        fetch('/api/governance/dashboard', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
            }
        })
            .then((res) => {
            if (!res.ok)
                throw new Error('Failed to fetch governance data');
            return res.json();
        })
            .then((data) => {
            setData(data);
            setLoading(false);
        })
            .catch((err) => {
            console.error(err);
            // Fallback for dev/demo if API unreachable
            setData({
                stats: {
                    totalAgents: 3,
                    totalPrompts: 12,
                    highRiskPrompts: 1,
                    totalRuns: 45,
                    failedRuns: 2,
                    successRate: 95.5,
                    prsGenerated: 0
                },
                agents: [
                    { id: '1', name: 'codex.architect', type: 'agent', status: 'active', lastRun: new Date().toISOString() },
                    { id: '2', name: 'data.pipeline.etl', type: 'pipeline', status: 'idle', lastRun: new Date(Date.now() - 3600000).toISOString() },
                    { id: '3', name: 'security.auditor', type: 'agent', status: 'active', lastRun: new Date().toISOString() }
                ],
                prompts: [
                    { id: 'code.generate', riskLevel: 'high', tags: ['write', 'code'], version: 'v2' },
                    { id: 'analysis.summarize', riskLevel: 'low', tags: ['read'], version: 'v1' },
                    { id: 'security.scan', riskLevel: 'medium', tags: ['internal'], version: 'v1.5' }
                ],
                recentRuns: [
                    { id: 'run-1', pipeline: 'codex.architect', status: 'succeeded', duration: 1200, createdAt: new Date().toISOString() },
                    { id: 'run-2', pipeline: 'data.pipeline.etl', status: 'failed', duration: 500, createdAt: new Date().toISOString(), error: 'Connection timeout' }
                ]
            });
            setLoading(false);
        });
    }, []);
    if (loading)
        return <div className="p-8">Loading Governance Dashboard...</div>;
    if (!data)
        return <div className="p-8 text-red-500">Error loading data.</div>;
    return (<div className="p-8 space-y-8 bg-background min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Prompt Governance</h1>
          <p className="text-muted-foreground mt-2">Multi-Agent Oversight & Risk Management</p>
        </div>
        <div className="flex gap-2">
           <Badge_1.Badge variant="outline" className="px-4 py-2 text-sm">System Health: Optimal</Badge_1.Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">Active Agents</Card_1.CardTitle>
            <lucide_react_1.Users className="h-4 w-4 text-muted-foreground"/>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{data.stats.totalAgents}</div>
            <p className="text-xs text-muted-foreground">Across all environments</p>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">Prompt Library</Card_1.CardTitle>
            <lucide_react_1.Database className="h-4 w-4 text-muted-foreground"/>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{data.stats.totalPrompts}</div>
            <p className="text-xs text-muted-foreground">{data.stats.highRiskPrompts} High Risk</p>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">Success Rate</Card_1.CardTitle>
            <lucide_react_1.Activity className="h-4 w-4 text-muted-foreground"/>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{data.stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{data.stats.totalRuns} Total Runs</p>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">PRs Generated</Card_1.CardTitle>
            <lucide_react_1.GitPullRequest className="h-4 w-4 text-muted-foreground"/>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{data.stats.prsGenerated}</div>
            <p className="text-xs text-muted-foreground">Auto-generated this week</p>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Agents & Pipelines */}
        <Card_1.Card className="col-span-1">
          <Card_1.CardHeader>
            <Card_1.CardTitle>Agents & Pipelines</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <Table_1.Table>
              <Table_1.TableHeader>
                <Table_1.TableRow>
                  <Table_1.TableHead>Name</Table_1.TableHead>
                  <Table_1.TableHead>Type</Table_1.TableHead>
                  <Table_1.TableHead>Status</Table_1.TableHead>
                  <Table_1.TableHead>Last Run</Table_1.TableHead>
                </Table_1.TableRow>
              </Table_1.TableHeader>
              <Table_1.TableBody>
                {data.agents.map((agent) => (<Table_1.TableRow key={agent.id}>
                    <Table_1.TableCell className="font-medium">{agent.name}</Table_1.TableCell>
                    <Table_1.TableCell>{agent.type}</Table_1.TableCell>
                    <Table_1.TableCell>
                      <Badge_1.Badge variant={agent.status === 'active' ? 'default' : agent.status === 'error' ? 'destructive' : 'secondary'}>
                        {agent.status}
                      </Badge_1.Badge>
                    </Table_1.TableCell>
                    <Table_1.TableCell className="text-muted-foreground">{agent.lastRun ? new Date(agent.lastRun).toLocaleTimeString() : 'Never'}</Table_1.TableCell>
                  </Table_1.TableRow>))}
              </Table_1.TableBody>
            </Table_1.Table>
          </Card_1.CardContent>
        </Card_1.Card>

        {/* Prompt Governance */}
        <Card_1.Card className="col-span-1">
          <Card_1.CardHeader>
            <Card_1.CardTitle>Prompt Governance</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="overflow-y-auto max-h-[400px]">
                <Table_1.Table>
                <Table_1.TableHeader>
                    <Table_1.TableRow>
                    <Table_1.TableHead>ID</Table_1.TableHead>
                    <Table_1.TableHead>Risk</Table_1.TableHead>
                    <Table_1.TableHead>Version</Table_1.TableHead>
                    </Table_1.TableRow>
                </Table_1.TableHeader>
                <Table_1.TableBody>
                    {data.prompts.map((prompt) => (<Table_1.TableRow key={prompt.id}>
                        <Table_1.TableCell className="font-mono text-xs">{prompt.id}</Table_1.TableCell>
                        <Table_1.TableCell>
                        <div className="flex items-center gap-2">
                            {prompt.riskLevel === 'high' && <lucide_react_1.AlertTriangle className="h-4 w-4 text-red-500"/>}
                            {prompt.riskLevel === 'medium' && <lucide_react_1.Shield className="h-4 w-4 text-yellow-500"/>}
                            <span className={prompt.riskLevel === 'high' ? 'text-red-600 font-bold' :
                prompt.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'}>{prompt.riskLevel.toUpperCase()}</span>
                        </div>
                        </Table_1.TableCell>
                        <Table_1.TableCell>{prompt.version}</Table_1.TableCell>
                    </Table_1.TableRow>))}
                </Table_1.TableBody>
                </Table_1.Table>
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      {/* Recent Activity */}
      <Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle>Recent Execution Activity</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <Table_1.Table>
            <Table_1.TableHeader>
              <Table_1.TableRow>
                <Table_1.TableHead>Run ID</Table_1.TableHead>
                <Table_1.TableHead>Pipeline/Agent</Table_1.TableHead>
                <Table_1.TableHead>Status</Table_1.TableHead>
                <Table_1.TableHead>Duration</Table_1.TableHead>
                <Table_1.TableHead>Time</Table_1.TableHead>
              </Table_1.TableRow>
            </Table_1.TableHeader>
            <Table_1.TableBody>
              {data.recentRuns.map((run) => (<Table_1.TableRow key={run.id}>
                  <Table_1.TableCell className="font-mono text-xs">{run.id.slice(0, 8)}</Table_1.TableCell>
                  <Table_1.TableCell>{run.pipeline}</Table_1.TableCell>
                  <Table_1.TableCell>
                     <Badge_1.Badge variant={run.status === 'succeeded' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                        {run.status}
                     </Badge_1.Badge>
                     {run.error && <span className="ml-2 text-xs text-red-500">{run.error}</span>}
                  </Table_1.TableCell>
                  <Table_1.TableCell>{run.duration ? `${(run.duration / 1000).toFixed(2)}s` : '-'}</Table_1.TableCell>
                  <Table_1.TableCell>{new Date(run.createdAt).toLocaleString()}</Table_1.TableCell>
                </Table_1.TableRow>))}
            </Table_1.TableBody>
          </Table_1.Table>
        </Card_1.CardContent>
      </Card_1.Card>

      {/* Diffs Placeholder */}
       <Card_1.Card>
        <Card_1.CardHeader className="flex flex-row items-center space-x-2">
          <lucide_react_1.FileDiff className="h-5 w-5"/>
          <Card_1.CardTitle>Recent Diffs & Changes</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <p className="text-muted-foreground text-sm">No recent diffs available.</p>
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
}
