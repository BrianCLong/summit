"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAReadinessPanel = exports.StreamingPanel = exports.ZKIsolationPanel = exports.ReleasePanel = exports.CIStatusPanel = exports.AgentControlPanel = exports.GovernancePanel = void 0;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Skeleton_1 = require("@/components/ui/Skeleton");
const StatusIndicator = ({ status }) => {
    const colors = {
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        red: 'bg-red-500',
    };
    return <div className={`w-3 h-3 rounded-full ${colors[status]}`}/>;
};
const GenericPanel = ({ title, data, loading, error, renderDetails }) => {
    if (loading) {
        return (<Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle>{title}</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <Skeleton_1.Skeleton className="h-24 w-full"/>
        </Card_1.CardContent>
      </Card_1.Card>);
    }
    if (error || !data) {
        return (<Card_1.Card className="border-red-500">
        <Card_1.CardHeader>
          <Card_1.CardTitle className="text-red-500">{title} (Offline)</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <p className="text-sm text-muted-foreground">{error || 'No data available'}</p>
        </Card_1.CardContent>
      </Card_1.Card>);
    }
    return (<Card_1.Card className={data.status === 'red' ? 'border-red-500' : data.status === 'yellow' ? 'border-yellow-500' : ''}>
      <Card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card_1.CardTitle className="text-sm font-medium">{title}</Card_1.CardTitle>
        <StatusIndicator status={data.status}/>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        {renderDetails(data.details)}
        {data.message && (<p className="mt-2 text-xs text-muted-foreground">{data.message}</p>)}
      </Card_1.CardContent>
    </Card_1.Card>);
};
const GovernancePanel = (props) => (<GenericPanel title="Governance" {...props} renderDetails={(details) => (<div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Protected Paths:</span>
          <span className="font-mono">{details.governanceProtectedPaths}</span>
        </div>
        <div className="flex justify-between">
          <span>Kill Switch:</span>
          <span className={details.killSwitchStatus === 'active' ? 'text-red-500 font-bold' : 'text-green-500'}>
            {details.killSwitchStatus}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Last Approval: {new Date(details.lastTier4Approval).toLocaleDateString()}
        </div>
      </div>)}/>);
exports.GovernancePanel = GovernancePanel;
const AgentControlPanel = (props) => (<GenericPanel title="Agent Control" {...props} renderDetails={(details) => (<div className="space-y-1 text-sm">
        <div className="flex justify-between">
            <span>Budget Usage:</span>
            <span className={details.budgetUsagePercent > 80 ? 'text-red-500 font-bold' : ''}>{details.budgetUsagePercent}%</span>
        </div>
        <div className="flex justify-between">
            <span>Active Agents:</span>
            <span>{Object.values(details.activeAgents).reduce((a, b) => a + b, 0)}</span>
        </div>
        {details.topRiskScores && details.topRiskScores.length > 0 && (<div className="mt-2">
                <p className="text-xs font-semibold mb-1">Top Risk:</p>
                {details.topRiskScores.map((risk) => (<div key={risk.agentId} className="flex justify-between text-xs">
                        <span>{risk.agentId}</span>
                        <span className="font-mono">{risk.score}</span>
                    </div>))}
            </div>)}
      </div>)}/>);
exports.AgentControlPanel = AgentControlPanel;
const CIStatusPanel = (props) => (<GenericPanel title="CI / PRs" {...props} renderDetails={(details) => (<div className="space-y-1 text-sm">
            <div className="flex justify-between">
                <span>Pass Rate:</span>
                <span>{(details.ciPassRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
                <span>Gov Failures (24h):</span>
                <span className={details.governanceFailures24h > 0 ? 'text-red-500 font-bold' : ''}>{details.governanceFailures24h}</span>
            </div>
             <div className="flex justify-between">
                <span>Open PRs:</span>
                <span>{Object.values(details.openPRs).reduce((a, b) => a + b, 0)}</span>
            </div>
        </div>)}/>);
exports.CIStatusPanel = CIStatusPanel;
const ReleasePanel = (props) => (<GenericPanel title="Releases" {...props} renderDetails={(details) => (<div className="space-y-1 text-sm">
             <div className="flex justify-between">
                <span>Current Train:</span>
                <Badge_1.Badge variant="outline">{details.currentTrain}</Badge_1.Badge>
            </div>
            <div className="flex justify-between">
                <span>Evidence:</span>
                <span>{(details.evidenceBundleCompleteness * 100).toFixed(0)}%</span>
            </div>
             <div className="text-xs text-muted-foreground mt-1 font-mono">
                {details.lastReleaseHash}
             </div>
        </div>)}/>);
exports.ReleasePanel = ReleasePanel;
const ZKIsolationPanel = (props) => (<GenericPanel title="ZK & Isolation" {...props} renderDetails={(details) => (<div className="space-y-1 text-sm">
            <div className="flex justify-between">
                <span>Protocol:</span>
                <span>{details.zkProtocolVersion}</span>
            </div>
             <div className="flex justify-between">
                <span>Violations:</span>
                <span className={details.isolationViolations > 0 ? 'text-red-500 font-bold' : 'text-green-500'}>{details.isolationViolations}</span>
            </div>
        </div>)}/>);
exports.ZKIsolationPanel = ZKIsolationPanel;
const StreamingPanel = (props) => (<GenericPanel title="Streaming Intel" {...props} renderDetails={(details) => (<div className="space-y-1 text-sm">
             <div className="flex justify-between">
                <span>Ingestion:</span>
                <span>{details.eventIngestionRate} /s</span>
            </div>
             <div className="flex justify-between">
                <span>Lag:</span>
                <span className={details.streamLagMs > 1000 ? 'text-yellow-500' : ''}>{details.streamLagMs} ms</span>
            </div>
             <div className="flex justify-between">
                <span>Freshness:</span>
                <span>{details.featureFreshnessMs} ms</span>
            </div>
        </div>)}/>);
exports.StreamingPanel = StreamingPanel;
const GAReadinessPanel = (props) => (<GenericPanel title="GA Readiness" {...props} renderDetails={(details) => (<div className="grid grid-cols-2 gap-2 text-sm mt-2">
            {Object.entries(details.checklist).map(([key, passed]) => (<div key={key} className="flex items-center space-x-2">
                    <span>{passed ? '✅' : '❌'}</span>
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>))}
        </div>)}/>);
exports.GAReadinessPanel = GAReadinessPanel;
