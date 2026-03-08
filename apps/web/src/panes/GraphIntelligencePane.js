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
exports.GraphIntelligencePane = GraphIntelligencePane;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const GraphCanvas_1 = require("@/graphs/GraphCanvas");
// API helpers (mocked here, but would connect to the new endpoints)
async function fetchGraphAnalysis(algorithm, params) {
    // In a real app, this fetches from /api/graph/${algorithm}
    // For now, we might need to just simulate or assume the backend works if we had a full integration test environment
    const response = await fetch(`/api/graph/${algorithm}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    if (!response.ok)
        throw new Error('Failed to fetch analysis');
    return response.json();
}
function GraphIntelligencePane() {
    const [selectedAlgorithm, setSelectedAlgorithm] = (0, react_1.useState)(null);
    const [results, setResults] = (0, react_1.useState)(null);
    const [nodes, setNodes] = (0, react_1.useState)([]);
    const [links, setLinks] = (0, react_1.useState)([]);
    const handleRunAlgorithm = async (algo) => {
        setSelectedAlgorithm(algo);
        try {
            const res = await fetchGraphAnalysis(algo);
            setResults(res);
            // If the algorithm returns nodes/scores, we update the graph visualization
            // This mapping depends on the exact shape of the API response
            // For this mock UI, we just show the raw results or assume a mapping
        }
        catch (err) {
            console.error(err);
        }
    };
    return (<div className="h-full w-full flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Graph Intelligence & Influence Operations</h2>
        <div className="flex gap-2">
            <Button_1.Button onClick={() => handleRunAlgorithm('centrality')} variant={selectedAlgorithm === 'centrality' ? 'default' : 'outline'}>
                Influence (Centrality)
            </Button_1.Button>
            <Button_1.Button onClick={() => handleRunAlgorithm('communities')} variant={selectedAlgorithm === 'communities' ? 'default' : 'outline'}>
                Communities
            </Button_1.Button>
            <Button_1.Button onClick={() => handleRunAlgorithm('influence/bots')} variant={selectedAlgorithm === 'influence/bots' ? 'destructive' : 'outline'}>
                Detect Bots
            </Button_1.Button>
            <Button_1.Button onClick={() => handleRunAlgorithm('influence/coordinated')} variant={selectedAlgorithm === 'influence/coordinated' ? 'destructive' : 'outline'}>
                Coordinated Behavior
            </Button_1.Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 h-[600px]">
        <div className="col-span-2 border rounded-lg overflow-hidden relative bg-slate-50 dark:bg-slate-900">
            {/*
          In a real implementation, we would pass the 'nodes' and 'links'
          derived from the algorithm results to GraphCanvas.
          For now, we render a placeholder or empty canvas.
        */}
            <GraphCanvas_1.GraphCanvas entities={nodes} relationships={links} layout={{ type: 'force' }}/>
            {nodes.length === 0 && (<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    Run an analysis to visualize the network
                </div>)}
        </div>

        <div className="col-span-1 overflow-y-auto">
            <Card_1.Card>
                <Card_1.CardHeader>
                    <Card_1.CardTitle>Analysis Results</Card_1.CardTitle>
                    <Card_1.CardDescription>
                        {selectedAlgorithm ? `Results for ${selectedAlgorithm}` : 'Select an algorithm to view results'}
                    </Card_1.CardDescription>
                </Card_1.CardHeader>
                <Card_1.CardContent>
                    {results ? (<pre className="text-xs overflow-auto bg-slate-100 dark:bg-slate-800 p-2 rounded max-h-[500px]">
                            {JSON.stringify(results, null, 2)}
                        </pre>) : (<div className="text-sm text-muted-foreground">
                            No data generated yet.
                        </div>)}
                </Card_1.CardContent>
            </Card_1.Card>
        </div>
      </div>
    </div>);
}
