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
exports.default = ExplainPanel;
const react_1 = __importStar(require("react"));
const workspaceStore_1 = require("../store/workspaceStore");
const lucide_react_1 = require("lucide-react");
function ExplainPanel() {
    const { entities, selectedEntityIds } = (0, workspaceStore_1.useWorkspaceStore)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [analysis, setAnalysis] = (0, react_1.useState)(null);
    const handleAnalyze = async () => {
        setIsLoading(true);
        // Simulate AI delay
        setTimeout(() => {
            const count = entities.length;
            const selected = entities.filter(e => selectedEntityIds.includes(e.id));
            const selectedNames = selected.map(e => e.label).join(', ');
            const text = selected.length > 0
                ? `Analysis focused on **${selectedNames}**. The entity appears to be central to the network with high connectivity. Temporal analysis suggests a pattern of movement from ${selected[0].lat?.toFixed(2)}, ${selected[0].lng?.toFixed(2)} coinciding with the reported events.`
                : `Overview of ${count} entities. The dataset reveals a clustered distribution in the North-East region. There is a spike in activity around late October 2023. Recommend investigating the high-degree nodes shown in purple.`;
            setAnalysis(text);
            setIsLoading(false);
        }, 1500);
    };
    return (<div className="h-full flex flex-col bg-slate-950 border-l border-slate-800 w-80 shrink-0">
      <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2 text-indigo-400">
            <lucide_react_1.Sparkles size={18}/>
            <h3 className="font-semibold text-sm tracking-wide">AI ASSISTANT</h3>
        </div>
        {/* Close button functionality would be handled by parent layout if this was a collapsible drawer */}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Current Context</h4>
            <div className="text-sm text-slate-300">
                <div className="flex justify-between mb-1">
                    <span>Entities Visible:</span>
                    <span className="font-mono">{entities.length}</span>
                </div>
                <div className="flex justify-between mb-1">
                    <span>Selected:</span>
                    <span className="font-mono text-cyan-400">{selectedEntityIds.length}</span>
                </div>
            </div>
        </div>

        {!analysis && !isLoading && (<button onClick={handleAnalyze} className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors">
                <lucide_react_1.Sparkles size={16}/>
                Generate Analysis
            </button>)}

        {isLoading && (<div className="space-y-3 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-800 rounded w-full"></div>
                <div className="h-4 bg-slate-800 rounded w-5/6"></div>
            </div>)}

        {analysis && (<div className="space-y-4">
                <div className="prose prose-invert prose-sm text-slate-300">
                    <p>{analysis}</p>
                </div>

                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Suggested Hypotheses</h4>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded text-sm text-slate-400 flex gap-2">
                        <lucide_react_1.AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5"/>
                        <span>Potential coordination between Subject A and Subject B based on temporal proximity.</span>
                    </div>
                </div>

                <button onClick={() => setAnalysis(null)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    Refresh Analysis
                </button>
            </div>)}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/30">
        <button className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded flex items-center justify-center gap-2 text-sm transition-colors">
            <lucide_react_1.FileText size={16}/>
            Add to Report
        </button>
      </div>
    </div>);
}
