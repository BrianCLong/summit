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
exports.GovernanceDashboard = GovernanceDashboard;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Table_1 = require("@/components/ui/Table");
const Badge_1 = require("@/components/ui/Badge");
const lucide_react_1 = require("lucide-react");
function GovernanceDashboard() {
    const [status, setStatus] = (0, react_1.useState)(null);
    const [violations, setViolations] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        const fetchData = async () => {
            try {
                // Fetch Status
                const statusRes = await fetch('/api/governance/status');
                if (statusRes.ok) {
                    const data = await statusRes.json();
                    setStatus(data);
                }
                else {
                    // Fallback for dev/demo if API not reachable
                    setStatus({
                        status: 'active',
                        environment: 'dev',
                        engine: 'PolicyEngine v1.0',
                        checks: { opa_connection: 'simulated', audit_log: 'active' }
                    });
                }
                // Fetch Violations
                const vioRes = await fetch('/api/governance/violations');
                if (vioRes.ok) {
                    const data = await vioRes.json();
                    setViolations(data);
                }
                else {
                    setViolations({
                        summary: { total_violations: 0, high_severity: 0, open_incidents: 0 },
                        events: []
                    });
                }
            }
            catch (error) {
                console.error('Failed to fetch governance data', error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    if (loading) {
        return <div className="p-6">Loading Governance Dashboard...</div>;
    }
    return (<div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Governance & Policy Fabric</h1>
        <Badge_1.Badge variant={status?.status === 'active' ? 'default' : 'destructive'} className="text-lg py-1">
          {status?.status === 'active' ? <lucide_react_1.ShieldCheck className="w-5 h-5 mr-2 inline"/> : <lucide_react_1.ShieldAlert className="w-5 h-5 mr-2 inline"/>}
          {status?.status?.toUpperCase() || 'UNKNOWN'}
        </Badge_1.Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">Environment</Card_1.CardTitle>
            <lucide_react_1.Activity className="h-4 w-4 text-muted-foreground"/>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{status?.environment?.toUpperCase() || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Engine: {status?.engine}</p>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">Violations (All Time)</Card_1.CardTitle>
            <lucide_react_1.ShieldAlert className="h-4 w-4 text-muted-foreground"/>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{violations?.summary?.total_violations || 0}</div>
            <p className="text-xs text-muted-foreground">High Severity: {violations?.summary?.high_severity || 0}</p>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card_1.CardTitle className="text-sm font-medium">Open Incidents</Card_1.CardTitle>
            <lucide_react_1.ShieldCheck className="h-4 w-4 text-muted-foreground"/>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-2xl font-bold">{violations?.summary?.open_incidents || 0}</div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      <Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle>Recent Policy Events</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
            <Table_1.Table>
                <Table_1.TableHeader>
                    <Table_1.TableRow>
                        <Table_1.TableHead>Time</Table_1.TableHead>
                        <Table_1.TableHead>Policy</Table_1.TableHead>
                        <Table_1.TableHead>Actor</Table_1.TableHead>
                        <Table_1.TableHead>Status</Table_1.TableHead>
                        <Table_1.TableHead>Details</Table_1.TableHead>
                    </Table_1.TableRow>
                </Table_1.TableHeader>
                <Table_1.TableBody>
                    {violations?.events?.length === 0 && <Table_1.TableRow><Table_1.TableCell colSpan={5} className="text-center">No violations found</Table_1.TableCell></Table_1.TableRow>}
                    {violations?.events?.map((evt) => (<Table_1.TableRow key={evt.id}>
                            <Table_1.TableCell>{new Date(evt.timestamp).toLocaleString()}</Table_1.TableCell>
                            <Table_1.TableCell className="font-medium">{evt.policy}</Table_1.TableCell>
                            <Table_1.TableCell>{evt.actor}</Table_1.TableCell>
                            <Table_1.TableCell>
                                <Badge_1.Badge variant={evt.status === 'BLOCKED' ? 'destructive' : 'secondary'}>
                                    {evt.status}
                                </Badge_1.Badge>
                            </Table_1.TableCell>
                            <Table_1.TableCell>{evt.details}</Table_1.TableCell>
                        </Table_1.TableRow>))}
                </Table_1.TableBody>
            </Table_1.Table>
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
}
