"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StrategyWall;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
function StrategyWall({ plan, loading }) {
    if (loading) {
        return <div>Loading Strategy Wall...</div>;
    }
    if (!plan) {
        return <div>No active strategic plan found.</div>;
    }
    return (<div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card_1.Card className="col-span-1 border-t-4 border-t-blue-500">
          <Card_1.CardHeader>
            <Card_1.CardTitle>Goals (Objectives)</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="space-y-4">
              {plan.objectives?.map((obj) => (<div key={obj.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm">{obj.name}</h4>
                    <Badge_1.Badge variant={obj.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {obj.status}
                    </Badge_1.Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{obj.description}</p>
                  <div className="mt-2 w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: `${obj.progress || 0}%` }}/>
                  </div>
                </div>))}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card className="col-span-1 border-t-4 border-t-purple-500">
          <Card_1.CardHeader>
            <Card_1.CardTitle>Bets (Initiatives)</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <div className="space-y-4">
              {plan.initiatives?.map((init) => (<div key={init.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm">{init.name}</h4>
                     <Badge_1.Badge variant="outline">{init.status}</Badge_1.Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{init.description}</p>
                   {init.budgetUtilization !== null && (<div className="mt-2 text-xs text-muted-foreground">
                        Budget: {Math.round(init.budgetUtilization)}%
                      </div>)}
                </div>))}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card className="col-span-1 border-t-4 border-t-green-500">
          <Card_1.CardHeader>
            <Card_1.CardTitle>Metrics (KPIs)</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
             <div className="space-y-4">
              {plan.kpis?.map((kpi) => (<div key={kpi.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-sm">{kpi.name}</h4>
                    <p className="text-xs text-muted-foreground">Target: {kpi.targetValue} {kpi.unit}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                        {kpi.currentValue} <span className="text-xs font-normal text-muted-foreground">{kpi.unit}</span>
                    </div>
                    <div className={`text-xs ${kpi.trend === 'UP' ? 'text-green-500' : kpi.trend === 'DOWN' ? 'text-red-500' : 'text-gray-500'}`}>
                        {kpi.trend}
                    </div>
                  </div>
                </div>))}
            </div>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>
    </div>);
}
