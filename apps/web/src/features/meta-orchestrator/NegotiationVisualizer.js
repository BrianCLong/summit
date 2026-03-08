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
exports.NegotiationVisualizer = void 0;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const scroll_area_1 = require("@/components/ui/scroll-area");
const NegotiationVisualizer = () => {
    const [negotiations, setNegotiations] = (0, react_1.useState)([]);
    const [agents, setAgents] = (0, react_1.useState)([]);
    const [selectedNegotiation, setSelectedNegotiation] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        // Mock data fetch - replace with API call
        const fetchNegotiations = async () => {
            // const res = await fetch('/api/meta-orchestrator/negotiations');
            // const data = await res.json();
            // setNegotiations(data);
        };
        fetchNegotiations();
    }, []);
    return (<div className="grid grid-cols-12 gap-4 h-full p-4">
      <div className="col-span-4 border-r pr-4">
        <h2 className="text-xl font-bold mb-4">Active Negotiations</h2>
        <scroll_area_1.ScrollArea className="h-[600px]">
          {negotiations.map(neg => (<Card_1.Card key={neg.id} className={`mb-4 cursor-pointer hover:bg-slate-50 ${selectedNegotiation?.id === neg.id ? 'border-primary' : ''}`} onClick={() => setSelectedNegotiation(neg)}>
              <Card_1.CardHeader className="pb-2">
                <Card_1.CardTitle className="text-sm font-medium flex justify-between">
                   {neg.topic}
                   <Badge_1.Badge>{neg.status}</Badge_1.Badge>
                </Card_1.CardTitle>
              </Card_1.CardHeader>
              <Card_1.CardContent>
                 <div className="text-xs text-muted-foreground">Rounds: {neg.rounds.length}</div>
              </Card_1.CardContent>
            </Card_1.Card>))}
          {negotiations.length === 0 && (<div className="text-center text-muted-foreground p-8">No active negotiations</div>)}
        </scroll_area_1.ScrollArea>
      </div>

      <div className="col-span-8">
        {selectedNegotiation ? (<div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{selectedNegotiation.topic}</h2>
                    <Badge_1.Badge variant="outline">{selectedNegotiation.status}</Badge_1.Badge>
                </div>

                <div className="flex-1 bg-slate-50 rounded-lg p-4 border border-slate-200 overflow-y-auto">
                    {/* Visualization of rounds would go here - e.g. a timeline or chat view */}
                    {selectedNegotiation.rounds.map((round, idx) => (<div key={round.id} className="mb-8">
                            <div className="flex items-center justify-center mb-4">
                                <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">Round {round.roundNumber}</span>
                            </div>
                            <div className="space-y-4">
                                {round.proposals.map((prop) => (<div key={prop.id} className="flex gap-4 p-4 bg-white rounded shadow-sm border">
                                        <div className="font-bold text-sm w-24 shrink-0">{prop.agentId}</div>
                                        <div className="text-sm">{JSON.stringify(prop.content)}</div>
                                    </div>))}
                            </div>
                        </div>))}
                </div>
            </div>) : (<div className="h-full flex items-center justify-center text-muted-foreground">
                Select a negotiation to view details
            </div>)}
      </div>
    </div>);
};
exports.NegotiationVisualizer = NegotiationVisualizer;
