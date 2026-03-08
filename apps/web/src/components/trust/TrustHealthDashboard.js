"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustHealthDashboard = void 0;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const lucide_react_1 = require("lucide-react");
// Mock Data for the initial dashboard
const MOCK_TRUST_DATA = {
    overallScore: 94,
    dimensions: {
        TRUTH: {
            score: 92,
            trend: 'STABLE',
            metrics: [
                { id: 't1', dimension: 'TRUTH', label: 'Doc Accuracy', value: 98, unit: '%', trend: 'UP', status: 'HEALTHY', description: 'User reported documentation accuracy' },
                { id: 't2', dimension: 'TRUTH', label: 'Demo Parity', value: 90, unit: '%', trend: 'STABLE', status: 'HEALTHY', description: 'Features matching sales demos' },
            ]
        },
        RELIABILITY: {
            score: 99,
            trend: 'UP',
            metrics: [
                { id: 'r1', dimension: 'RELIABILITY', label: 'SLO Compliance', value: 99.9, unit: '%', trend: 'UP', status: 'HEALTHY', description: 'Global API Availability' },
                { id: 'r2', dimension: 'RELIABILITY', label: 'Incident Comms', value: 4.8, unit: '/5', trend: 'UP', status: 'HEALTHY', description: 'CSAT on incident communication' },
            ]
        },
        GOVERNANCE: {
            score: 88,
            trend: 'DOWN', // Slightly down to show "Sensitivity"
            metrics: [
                { id: 'g1', dimension: 'GOVERNANCE', label: 'Privacy Inquiries', value: 12, unit: 'count', trend: 'UP', status: 'WARNING', description: 'Open tickets regarding data privacy' },
                { id: 'g2', dimension: 'GOVERNANCE', label: 'Audit Log Usage', value: 450, unit: 'daily', trend: 'UP', status: 'HEALTHY', description: 'Active governance checks by users' },
            ]
        },
        TRANSPARENCY: {
            score: 95,
            trend: 'STABLE',
            metrics: [
                { id: 'tr1', dimension: 'TRANSPARENCY', label: 'Changelog Views', value: 1200, unit: 'views', trend: 'UP', status: 'HEALTHY', description: 'Engagement with release notes' },
            ]
        }
    },
    recentSignals: [
        { id: 's1', timestamp: '2025-10-25T10:00:00Z', dimension: 'GOVERNANCE', severity: 'MEDIUM', source: 'SUPPORT', summary: 'Customer question about data residency in EU.' },
        { id: 's2', timestamp: '2025-10-24T14:30:00Z', dimension: 'RELIABILITY', severity: 'INFO', source: 'SYSTEM', summary: 'Minor latency spike in Search API, recovered automatically.' },
        { id: 's3', timestamp: '2025-10-23T09:15:00Z', dimension: 'TRUTH', severity: 'LOW', source: 'SUPPORT', summary: 'Typo in API docs for /v1/auth.' },
    ]
};
const DimensionIcon = ({ dimension }) => {
    switch (dimension) {
        case 'TRUTH': return <lucide_react_1.FileText className="h-5 w-5"/>;
        case 'RELIABILITY': return <lucide_react_1.Activity className="h-5 w-5"/>;
        case 'GOVERNANCE': return <lucide_react_1.Lock className="h-5 w-5"/>;
        case 'TRANSPARENCY': return <lucide_react_1.Megaphone className="h-5 w-5"/>;
        default: return <lucide_react_1.ShieldCheck className="h-5 w-5"/>;
    }
};
const TrendIcon = ({ trend }) => {
    switch (trend) {
        case 'UP': return <lucide_react_1.TrendingUp className="h-4 w-4 text-green-500"/>;
        case 'DOWN': return <lucide_react_1.TrendingDown className="h-4 w-4 text-red-500"/>;
        default: return <lucide_react_1.Minus className="h-4 w-4 text-gray-500"/>;
    }
};
const ScoreCard = ({ dimension, data }) => (<Card_1.Card className="border-l-4 border-l-blue-500">
    <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Card_1.CardTitle className="text-sm font-medium flex items-center gap-2">
        <DimensionIcon dimension={dimension}/>
        {dimension}
      </Card_1.CardTitle>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">{data.score}</span>
        <TrendIcon trend={data.trend}/>
      </div>
    </Card_1.CardHeader>
    <Card_1.CardContent>
      <div className="space-y-4">
        {data.metrics.map((metric) => (<div key={metric.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{metric.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">{metric.value}{metric.unit}</span>
              <Badge_1.Badge variant={metric.status === 'CRITICAL' ? 'destructive' : metric.status === 'WARNING' ? 'secondary' : 'outline'} className="text-[10px] px-1 h-5">
                {metric.status}
              </Badge_1.Badge>
            </div>
          </div>))}
      </div>
    </Card_1.CardContent>
  </Card_1.Card>);
const TrustHealthDashboard = () => {
    return (<div className="p-6 space-y-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trust Health</h2>
          <p className="text-muted-foreground">Real-time signals of Customer Trust across 4 dimensions.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Trust Score</p>
            <p className="text-4xl font-bold text-green-600">{MOCK_TRUST_DATA.overallScore}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ScoreCard dimension="TRUTH" data={MOCK_TRUST_DATA.dimensions.TRUTH}/>
        <ScoreCard dimension="RELIABILITY" data={MOCK_TRUST_DATA.dimensions.RELIABILITY}/>
        <ScoreCard dimension="GOVERNANCE" data={MOCK_TRUST_DATA.dimensions.GOVERNANCE}/>
        <ScoreCard dimension="TRANSPARENCY" data={MOCK_TRUST_DATA.dimensions.TRANSPARENCY}/>
      </div>

      <Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle>Recent Trust Signals</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <div className="space-y-4">
            {MOCK_TRUST_DATA.recentSignals.map((signal) => (<div key={signal.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge_1.Badge variant="outline">{signal.dimension}</Badge_1.Badge>
                    <Badge_1.Badge variant={signal.severity === 'CRITICAL' || signal.severity === 'HIGH' ? 'destructive' : 'secondary'}>
                      {signal.severity}
                    </Badge_1.Badge>
                    <span className="text-sm font-medium">{signal.summary}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(signal.timestamp).toLocaleString()}</span>
                    <span>•</span>
                    <span>Source: {signal.source}</span>
                  </div>
                </div>
              </div>))}
          </div>
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
};
exports.TrustHealthDashboard = TrustHealthDashboard;
