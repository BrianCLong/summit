"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrowthPlaybookView = GrowthPlaybookView;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const lucide_react_1 = require("lucide-react");
function GrowthPlaybookView({ playbook }) {
    return (<div className="space-y-6 max-w-4xl mx-auto">
      <Card_1.Card className="border-l-4 border-l-primary">
        <Card_1.CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <Card_1.CardTitle className="text-2xl">{playbook.title}</Card_1.CardTitle>
              <Card_1.CardDescription className="mt-2">{playbook.summary}</Card_1.CardDescription>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium text-muted-foreground">Readiness Score</span>
              <span className="text-3xl font-bold text-primary">{playbook.score}</span>
            </div>
          </div>
        </Card_1.CardHeader>
      </Card_1.Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.CheckCircle2 className="h-5 w-5 text-green-500"/>
              Strengths
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <ul className="space-y-2">
              {playbook.strengths.map((s, i) => (<li key={i} className="flex items-start gap-2">
                  <Badge_1.Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                    Strong
                  </Badge_1.Badge>
                  <span>{s}</span>
                </li>))}
            </ul>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.AlertTriangle className="h-5 w-5 text-amber-500"/>
              Areas for Improvement
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <ul className="space-y-2">
              {playbook.weaknesses.map((w, i) => (<li key={i} className="flex items-start gap-2">
                  <Badge_1.Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-200">
                    Focus
                  </Badge_1.Badge>
                  <span>{w}</span>
                </li>))}
            </ul>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      <Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.TrendingUp className="h-5 w-5 text-blue-500"/>
            Strategic Initiatives
          </Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <div className="grid gap-4">
            {playbook.strategic_initiatives.map((init, i) => (<div key={i} className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{init.title}</h3>
                  <Badge_1.Badge>{init.timeline}</Badge_1.Badge>
                </div>
                <p className="text-muted-foreground">{init.description}</p>
              </div>))}
          </div>
        </Card_1.CardContent>
      </Card_1.Card>

      <Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.Target className="h-5 w-5 text-purple-500"/>
            Tactical Actions
          </Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <ul className="space-y-3">
            {playbook.tactical_actions.map((action, i) => (<li key={i} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                <div className="h-6 w-6 rounded-full border-2 border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {i + 1}
                </div>
                <span>{action}</span>
              </li>))}
          </ul>
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
}
