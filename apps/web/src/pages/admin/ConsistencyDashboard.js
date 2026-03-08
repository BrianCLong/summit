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
exports.ConsistencyDashboard = void 0;
const react_1 = __importStar(require("react"));
const ui_1 = require("@/components/ui");
const lucide_react_1 = require("lucide-react");
const ConsistencyDashboard = () => {
    const [reports, setReports] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [repairing, setRepairing] = (0, react_1.useState)(null);
    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token'); // Or use useAuth hook
            const res = await fetch('/api/consistency/reports', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok)
                throw new Error('Failed to fetch reports');
            const data = await res.json();
            setReports(data);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchReports();
    }, []);
    const handleRepair = async (investigationId) => {
        setRepairing(investigationId);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/consistency/repair/${investigationId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok)
                throw new Error('Repair failed');
            await fetchReports();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setRepairing(null);
        }
    };
    return (<div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Graph Consistency</h1>
            <p className="text-muted-foreground">Monitor and repair data drift between Postgres and Neo4j.</p>
        </div>
        <ui_1.Button onClick={fetchReports} disabled={loading}>
          <lucide_react_1.RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>
          Refresh
        </ui_1.Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ui_1.Card>
          <ui_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ui_1.CardTitle className="text-sm font-medium">Drifted Investigations</ui_1.CardTitle>
            <lucide_react_1.AlertTriangle className="h-4 w-4 text-yellow-500"/>
          </ui_1.CardHeader>
          <ui_1.CardContent>
            <div className="text-2xl font-bold">{reports.filter(r => r.status === 'drifted').length}</div>
          </ui_1.CardContent>
        </ui_1.Card>
        <ui_1.Card>
          <ui_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ui_1.CardTitle className="text-sm font-medium">Clean Investigations</ui_1.CardTitle>
            <lucide_react_1.CheckCircle className="h-4 w-4 text-green-500"/>
          </ui_1.CardHeader>
          <ui_1.CardContent>
            <div className="text-2xl font-bold">{reports.filter(r => r.status === 'clean').length}</div>
          </ui_1.CardContent>
        </ui_1.Card>
        <ui_1.Card>
            <ui_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ui_1.CardTitle className="text-sm font-medium">Total Checked</ui_1.CardTitle>
            <lucide_react_1.RefreshCw className="h-4 w-4 text-muted-foreground"/>
          </ui_1.CardHeader>
          <ui_1.CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </ui_1.CardContent>
        </ui_1.Card>
      </div>

      <ui_1.Card>
        <ui_1.CardHeader>
          <ui_1.CardTitle>Investigation Reports</ui_1.CardTitle>
        </ui_1.CardHeader>
        <ui_1.CardContent>
          <ui_1.Table>
            <ui_1.TableHeader>
              <ui_1.TableRow>
                <ui_1.TableHead>Investigation ID</ui_1.TableHead>
                <ui_1.TableHead>Entities (PG / Neo4j)</ui_1.TableHead>
                <ui_1.TableHead>Relationships (PG / Neo4j)</ui_1.TableHead>
                <ui_1.TableHead>Status</ui_1.TableHead>
                <ui_1.TableHead>Actions</ui_1.TableHead>
              </ui_1.TableRow>
            </ui_1.TableHeader>
            <ui_1.TableBody>
              {reports.map((report) => (<ui_1.TableRow key={report.investigationId}>
                  <ui_1.TableCell className="font-mono text-xs">{report.investigationId}</ui_1.TableCell>
                  <ui_1.TableCell>
                    {report.postgresEntityCount} / {report.neo4jEntityCount}
                    {report.postgresEntityCount !== report.neo4jEntityCount && (<span className="ml-2 text-red-500 text-xs">
                             Diff: {report.postgresEntityCount - report.neo4jEntityCount}
                        </span>)}
                  </ui_1.TableCell>
                   <ui_1.TableCell>
                    {report.postgresRelationshipCount} / {report.neo4jRelationshipCount}
                    {report.postgresRelationshipCount !== report.neo4jRelationshipCount && (<span className="ml-2 text-red-500 text-xs">
                             Diff: {report.postgresRelationshipCount - report.neo4jRelationshipCount}
                        </span>)}
                  </ui_1.TableCell>
                  <ui_1.TableCell>
                    {report.status === 'clean' ? (<ui_1.Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Clean</ui_1.Badge>) : (<ui_1.Badge variant="destructive">Drift Detected</ui_1.Badge>)}
                  </ui_1.TableCell>
                  <ui_1.TableCell>
                    {report.status === 'drifted' && (<ui_1.Button size="sm" variant="secondary" onClick={() => handleRepair(report.investigationId)} disabled={repairing === report.investigationId}>
                            <lucide_react_1.Hammer className="mr-2 h-3 w-3"/>
                            {repairing === report.investigationId ? 'Repairing...' : 'Repair'}
                        </ui_1.Button>)}
                  </ui_1.TableCell>
                </ui_1.TableRow>))}
              {reports.length === 0 && !loading && (<ui_1.TableRow>
                      <ui_1.TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No reports generated. Run a check or wait for the scheduled job.
                      </ui_1.TableCell>
                  </ui_1.TableRow>)}
            </ui_1.TableBody>
          </ui_1.Table>
        </ui_1.CardContent>
      </ui_1.Card>
    </div>);
};
exports.ConsistencyDashboard = ConsistencyDashboard;
