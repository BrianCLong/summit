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
exports.GrowthPlaybookGenerator = GrowthPlaybookGenerator;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const textarea_1 = require("@/components/ui/textarea");
const Select_1 = require("@/components/ui/Select");
const lucide_react_1 = require("lucide-react");
function GrowthPlaybookGenerator({ onGenerate, isLoading }) {
    const [profile, setProfile] = (0, react_1.useState)({
        name: '',
        industry: '',
        stage: 'growth',
        employees: 0,
        revenue: 0,
        challenges: [],
        goals: []
    });
    const [challengesInput, setChallengesInput] = (0, react_1.useState)('');
    const [goalsInput, setGoalsInput] = (0, react_1.useState)('');
    const handleSubmit = (e) => {
        e.preventDefault();
        onGenerate({
            ...profile,
            challenges: challengesInput.split(',').map(s => s.trim()).filter(Boolean),
            goals: goalsInput.split(',').map(s => s.trim()).filter(Boolean)
        });
    };
    return (<Card_1.Card className="w-full max-w-2xl mx-auto">
      <Card_1.CardHeader>
        <Card_1.CardTitle>Summit Growth Playbook Generator</Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="name">Company Name</label_1.Label>
              <input_1.Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="industry">Industry</label_1.Label>
              <input_1.Input id="industry" value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} required/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="employees">Employees</label_1.Label>
              <input_1.Input id="employees" type="number" value={profile.employees} onChange={(e) => setProfile({ ...profile, employees: parseInt(e.target.value) })} required/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="revenue">Revenue (Annual)</label_1.Label>
              <input_1.Input id="revenue" type="number" value={profile.revenue} onChange={(e) => setProfile({ ...profile, revenue: parseInt(e.target.value) })} required/>
            </div>
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="stage">Stage</label_1.Label>
            <Select_1.Select value={profile.stage} onValueChange={(val) => setProfile({ ...profile, stage: val })}>
              <Select_1.SelectTrigger>
                <Select_1.SelectValue placeholder="Select stage"/>
              </Select_1.SelectTrigger>
              <Select_1.SelectContent>
                <Select_1.SelectItem value="startup">Startup</Select_1.SelectItem>
                <Select_1.SelectItem value="growth">Growth</Select_1.SelectItem>
                <Select_1.SelectItem value="scaleup">Scale-up</Select_1.SelectItem>
                <Select_1.SelectItem value="enterprise">Enterprise</Select_1.SelectItem>
              </Select_1.SelectContent>
            </Select_1.Select>
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="challenges">Key Challenges (comma separated)</label_1.Label>
            <textarea_1.Textarea id="challenges" value={challengesInput} onChange={(e) => setChallengesInput(e.target.value)} placeholder="e.g., Hiring velocity, Customer churn, Tech debt" required/>
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="goals">Strategic Goals (comma separated)</label_1.Label>
            <textarea_1.Textarea id="goals" value={goalsInput} onChange={(e) => setGoalsInput(e.target.value)} placeholder="e.g., 3x revenue in 3 years, Expand to EU, IPO readiness" required/>
          </div>

          <Button_1.Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (<>
                <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                Generating Playbook...
              </>) : ('Generate Playbook')}
          </Button_1.Button>
        </form>
      </Card_1.CardContent>
    </Card_1.Card>);
}
