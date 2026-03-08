"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HealthSignals;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
function HealthSignals({ progress, kpis = [] }) {
    if (!progress)
        return (<div className="text-muted-foreground p-4">Select a plan to view health signals.</div>);
    const healthScore = progress.healthScore ?? 0;
    const signals = kpis.slice(0, 3);
    return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card_1.Card>
        <Card_1.CardHeader className="pb-2">
          <Card_1.CardTitle className="text-sm font-medium">Plan Health Score</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <div className={`text-2xl font-bold ${healthScore >= 80 ? 'text-green-500' : healthScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
              {healthScore}
          </div>
          <p className="text-xs text-muted-foreground">Overall automated score</p>
        </Card_1.CardContent>
      </Card_1.Card>

      {signals.map((kpi) => (<Card_1.Card key={kpi.id}>
            <Card_1.CardHeader className="pb-2">
            <Card_1.CardTitle className="text-sm font-medium">{kpi.name}</Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent>
            <div className="text-2xl font-bold">{kpi.currentValue} {kpi.unit}</div>
            <p className="text-xs text-muted-foreground">Target: {kpi.targetValue}</p>
            </Card_1.CardContent>
        </Card_1.Card>))}

        <Card_1.Card>
            <Card_1.CardHeader className="pb-2">
            <Card_1.CardTitle className="text-sm font-medium">Risk Summary</Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent>
            <div className="text-2xl font-bold text-red-500">{progress.riskSummary?.critical || 0} Critical</div>
            <p className="text-xs text-muted-foreground">{progress.riskSummary?.high || 0} High Risks</p>
            </Card_1.CardContent>
        </Card_1.Card>
    </div>);
}
