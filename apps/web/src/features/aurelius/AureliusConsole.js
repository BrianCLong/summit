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
exports.AureliusConsole = void 0;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const input_1 = require("@/components/ui/input");
const Badge_1 = require("@/components/ui/Badge");
const Tabs_1 = require("@/components/ui/Tabs");
// Mock API calls for UI demo
const mockApi = {
    searchPriorArt: async (query) => [
        { title: 'System for X', score: 0.85, id: '1' },
        { title: 'Method for Y', score: 0.72, id: '2' }
    ],
    generateInvention: async (concepts, problem) => ({
        title: `Novel System for ${concepts}`,
        abstract: `A system solving ${problem}...`,
        claims: ['Claim 1...', 'Claim 2...'],
        noveltyScore: 0.88
    })
};
const AureliusConsole = () => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('ip-explorer');
    return (<div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Aurelius IP Engine</h1>
        <Badge_1.Badge variant="outline">Strategic Foresight Active</Badge_1.Badge>
      </div>

      <Tabs_1.Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs_1.TabsList>
          <Tabs_1.TabsTrigger value="ip-explorer">IP Explorer</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="invention-workbench">Invention Workbench</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="foresight">Strategic Foresight</Tabs_1.TabsTrigger>
        </Tabs_1.TabsList>

        <Tabs_1.TabsContent value="ip-explorer">
          <IPExplorerPane />
        </Tabs_1.TabsContent>

        <Tabs_1.TabsContent value="invention-workbench">
          <InventionWorkbenchPane />
        </Tabs_1.TabsContent>

        <Tabs_1.TabsContent value="foresight">
          <ForesightPane />
        </Tabs_1.TabsContent>
      </Tabs_1.Tabs>
    </div>);
};
exports.AureliusConsole = AureliusConsole;
const IPExplorerPane = () => {
    const [query, setQuery] = (0, react_1.useState)('');
    const [results, setResults] = (0, react_1.useState)([]);
    const handleSearch = async () => {
        const data = await mockApi.searchPriorArt(query);
        setResults(data);
    };
    return (<Card_1.Card>
      <Card_1.CardHeader>
        <Card_1.CardTitle>Global Patent Search</Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-4">
        <div className="flex gap-2">
          <input_1.Input placeholder="Search concepts, patents, or prior art..." value={query} onChange={(e) => setQuery(e.target.value)}/>
          <Button_1.Button onClick={handleSearch}>Search</Button_1.Button>
        </div>
        <div className="space-y-2">
          {results.map((r) => (<div key={r.id} className="p-4 border rounded hover:bg-muted/50">
              <div className="font-semibold">{r.title}</div>
              <div className="text-sm text-muted-foreground">Relevance: {(r.score * 100).toFixed(1)}%</div>
            </div>))}
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
};
const InventionWorkbenchPane = () => {
    const [problem, setProblem] = (0, react_1.useState)('');
    const [concepts, setConcepts] = (0, react_1.useState)('');
    const [draft, setDraft] = (0, react_1.useState)(null);
    const handleGenerate = async () => {
        const data = await mockApi.generateInvention(concepts, problem);
        setDraft(data);
    };
    return (<div className="grid grid-cols-2 gap-6">
      <Card_1.Card>
        <Card_1.CardHeader><Card_1.CardTitle>Invention Parameters</Card_1.CardTitle></Card_1.CardHeader>
        <Card_1.CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Problem Statement</label>
            <input_1.Input value={problem} onChange={e => setProblem(e.target.value)} placeholder="Describe the technical problem..."/>
          </div>
          <div>
            <label className="text-sm font-medium">Key Concepts</label>
            <input_1.Input value={concepts} onChange={e => setConcepts(e.target.value)} placeholder="Comma-separated concepts..."/>
          </div>
          <Button_1.Button onClick={handleGenerate} className="w-full">Generate Candidate Draft</Button_1.Button>
        </Card_1.CardContent>
      </Card_1.Card>

      {draft && (<Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>{draft.title}</Card_1.CardTitle>
            <Badge_1.Badge variant={draft.noveltyScore > 0.8 ? 'default' : 'secondary'}>
              Novelty Score: {(draft.noveltyScore * 100).toFixed(0)}
            </Badge_1.Badge>
          </Card_1.CardHeader>
          <Card_1.CardContent className="space-y-4">
            <div className="p-4 bg-muted/30 rounded text-sm">
              <strong>Abstract:</strong> {draft.abstract}
            </div>
            <div>
              <strong>Claims:</strong>
              <ul className="list-disc pl-5 text-sm mt-2">
                {draft.claims.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </Card_1.CardContent>
        </Card_1.Card>)}
    </div>);
};
const ForesightPane = () => {
    return (<Card_1.Card>
            <Card_1.CardHeader><Card_1.CardTitle>Simulation Engine</Card_1.CardTitle></Card_1.CardHeader>
            <Card_1.CardContent>
                <div className="text-muted-foreground text-sm">
                    Zephyrus Simulation Engine active. Run scenarios to forecast technology trajectories.
                </div>
                {/* Placeholder for complex chart UI */}
                <div className="h-64 bg-muted/20 rounded mt-4 flex items-center justify-center border border-dashed">
                    Forecast Visualization Area
                </div>
            </Card_1.CardContent>
        </Card_1.Card>);
};
