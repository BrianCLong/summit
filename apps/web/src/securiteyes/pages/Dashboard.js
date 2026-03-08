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
exports.SecuriteyesDashboard = void 0;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Table_1 = require("@/components/ui/Table");
const Badge_1 = require("@/components/ui/Badge");
const lucide_react_1 = require("lucide-react");
const Tabs_1 = require("@/components/ui/Tabs");
const InvestigationWorkbench_1 = require("../components/InvestigationWorkbench");
const RiskProfileView_1 = require("../components/RiskProfileView");
const SecuriteyesDashboard = () => {
    const [stats, setStats] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        // Mock fetch for now as we don't have the full client api client set up in this context
        fetch('/securiteyes/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Simplified
            }
        })
            .then(res => res.json())
            .then(data => {
            setStats(data);
            setLoading(false);
        })
            .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);
    if (loading)
        return <div>Loading Securiteyes...</div>;
    if (!stats)
        return <div>Error loading data</div>;
    return (<div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <lucide_react_1.Shield className="w-8 h-8 text-blue-600"/>
        Securiteyes Threat Intelligence
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Active Incidents</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="text-4xl font-bold text-red-600">{stats.activeIncidentsCount}</div>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Recent Events</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
             <div className="text-4xl font-bold text-yellow-600">{stats.recentEventsCount}</div>
          </Card_1.CardContent>
        </Card_1.Card>
         <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>High Risk Accounts</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
             <div className="text-4xl font-bold text-orange-600">{stats.highRiskCount}</div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      <Tabs_1.Tabs defaultValue="incidents">
          <Tabs_1.TabsList>
              <Tabs_1.TabsTrigger value="incidents">Incidents</Tabs_1.TabsTrigger>
              <Tabs_1.TabsTrigger value="investigation">Investigation</Tabs_1.TabsTrigger>
              <Tabs_1.TabsTrigger value="risk">Insider Risk</Tabs_1.TabsTrigger>
          </Tabs_1.TabsList>

          <Tabs_1.TabsContent value="incidents">
              <Card_1.Card>
                <Card_1.CardHeader>
                    <Card_1.CardTitle>Active Incidents</Card_1.CardTitle>
                </Card_1.CardHeader>
                <Card_1.CardContent>
                    <Table_1.Table>
                        <Table_1.TableHeader>
                            <Table_1.TableRow>
                                <Table_1.TableHead>Title</Table_1.TableHead>
                                <Table_1.TableHead>Severity</Table_1.TableHead>
                                <Table_1.TableHead>Status</Table_1.TableHead>
                                <Table_1.TableHead>Created</Table_1.TableHead>
                            </Table_1.TableRow>
                        </Table_1.TableHeader>
                        <Table_1.TableBody>
                            {stats.activeIncidents.map((inc) => (<Table_1.TableRow key={inc.id}>
                                    <Table_1.TableCell>{inc.title}</Table_1.TableCell>
                                    <Table_1.TableCell>
                                        <Badge_1.Badge variant={inc.severity === 'critical' ? 'destructive' : 'default'}>
                                            {inc.severity}
                                        </Badge_1.Badge>
                                    </Table_1.TableCell>
                                    <Table_1.TableCell>{inc.status}</Table_1.TableCell>
                                    <Table_1.TableCell>{new Date(inc.createdAt).toLocaleString()}</Table_1.TableCell>
                                </Table_1.TableRow>))}
                        </Table_1.TableBody>
                    </Table_1.Table>
                </Card_1.CardContent>
              </Card_1.Card>
          </Tabs_1.TabsContent>

          <Tabs_1.TabsContent value="investigation">
              <InvestigationWorkbench_1.InvestigationWorkbench />
          </Tabs_1.TabsContent>

          <Tabs_1.TabsContent value="risk">
              <RiskProfileView_1.RiskProfileView />
          </Tabs_1.TabsContent>
      </Tabs_1.Tabs>
    </div>);
};
exports.SecuriteyesDashboard = SecuriteyesDashboard;
