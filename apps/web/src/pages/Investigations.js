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
exports.default = Investigations;
const react_1 = __importStar(require("react"));
const GraphView_1 = require("../components/GraphView");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const lucide_react_1 = require("lucide-react");
// Mock data for initial state
const MOCK_ENTITIES = [
    {
        id: 'e1',
        name: 'Strategic Hub Alpha',
        type: 'ORGANIZATION',
        confidence: 0.98,
        properties: { drift: false, industry: 'Defense', location: 'Virginia' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'e2',
        name: 'Node Beta',
        type: 'SYSTEM',
        confidence: 0.85,
        properties: { drift: true, version: '2.4.1', status: 'degraded' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'e3',
        name: 'Operator Gamma',
        type: 'PERSON',
        confidence: 0.92,
        properties: { drift: false, clearance: 'Top Secret' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];
const MOCK_RELATIONSHIPS = [
    {
        id: 'r1',
        sourceId: 'e1',
        targetId: 'e2',
        type: 'OWNS',
        confidence: 1.0,
        properties: {},
        createdAt: new Date().toISOString(),
        direction: 'directed',
    },
    {
        id: 'r2',
        sourceId: 'e3',
        targetId: 'e2',
        type: 'WORKS_FOR',
        confidence: 0.9,
        properties: { style: 'dashed' },
        createdAt: new Date().toISOString(),
        direction: 'directed',
    },
];
/**
 * Investigations Page - Responsive analysis view for Org Mesh.
 * Features ARIA-live announcements and WCAG-compliant interactions.
 */
function Investigations() {
    const [entities] = (0, react_1.useState)(MOCK_ENTITIES);
    const [relationships] = (0, react_1.useState)(MOCK_RELATIONSHIPS);
    const [selectedEntity, setSelectedEntity] = (0, react_1.useState)(null);
    const [announcement, setAnnouncement] = (0, react_1.useState)('');
    const [isEnriching, setIsEnriching] = (0, react_1.useState)(false);
    const handleEntitySelect = (0, react_1.useCallback)((entity) => {
        setSelectedEntity(entity);
        // Screen reader announcement
        setAnnouncement(`Selected entity: ${entity.name}, type: ${entity.type}. ${entity.properties?.drift ? 'Warning: This entity is in drift state.' : ''}`);
    }, []);
    const handleEnrich = (0, react_1.useCallback)(async () => {
        setIsEnriching(true);
        setAnnouncement('Starting data enrichment for Org Mesh...');
        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsEnriching(false);
        setAnnouncement('Enrichment complete. No new drift detected in 54 nodes.');
    }, []);
    return (<div className="flex flex-col h-full bg-slate-50 overflow-hidden" data-testid="investigations-page">
      {/* Accessible Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Responsive Header */}
      <header className="bg-white border-b px-4 lg:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 shadow-sm z-10 gap-4">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
                <lucide_react_1.Search className="h-5 w-5" aria-hidden="true"/>
            </div>
            <div>
                <h1 className="text-lg lg:text-xl font-bold text-slate-900">Investigation Workbench</h1>
                <p className="text-[10px] lg:text-xs text-slate-500 font-medium uppercase tracking-wider">Buyer View: Org Mesh Analysis</p>
            </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button_1.Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <lucide_react_1.Filter className="h-4 w-4 mr-2" aria-hidden="true"/>
                Filter
            </Button_1.Button>
            <Button_1.Button variant="default" size="sm" onClick={handleEnrich} loading={isEnriching} className="flex-1 sm:flex-none">
                <lucide_react_1.Zap className="h-4 w-4 mr-2" aria-hidden="true"/>
                Auto-Enrich
            </Button_1.Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Graph Area - Optimized for Mobile Pan/Zoom via GraphView */}
        <main className="flex-1 relative min-h-[300px] min-w-0 bg-slate-100 p-2 lg:p-4" role="main">
            <div className="w-full h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <GraphView_1.GraphView entities={entities} relationships={relationships} onEntitySelect={handleEntitySelect} selectedEntityId={selectedEntity?.id}/>
            </div>
        </main>

        {/* Details Sidebar - Responsive (Bottom on mobile, Right on Desktop) */}
        <aside className="w-full lg:w-96 h-1/3 lg:h-auto border-t lg:border-t-0 lg:border-l bg-white flex flex-col shrink-0 overflow-y-auto" aria-label="Intelligence Details">
            {selectedEntity ? (<div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <Badge_1.Badge variant="secondary" className="px-2 py-0">{selectedEntity.type}</Badge_1.Badge>
                            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">{selectedEntity.name}</h2>
                        </div>
                        {selectedEntity.properties?.drift && (<Badge_1.Badge variant="destructive" className="flex gap-1 items-center px-2 animate-pulse">
                                <lucide_react_1.ShieldAlert className="h-3 w-3" aria-hidden="true"/>
                                Drift Detected
                            </Badge_1.Badge>)}
                    </div>

                    <div className="space-y-4">
                        <section aria-labelledby="confidence-label">
                            <h3 id="confidence-label" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Confidence Score</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${selectedEntity.confidence * 100}%` }} role="progressbar" aria-valuenow={Math.round(selectedEntity.confidence * 100)} aria-valuemin={0} aria-valuemax={100}></div>
                                </div>
                                <span className="text-sm font-bold text-slate-700">{Math.round(selectedEntity.confidence * 100)}%</span>
                            </div>
                        </section>

                        <section aria-labelledby="properties-label">
                            <h3 id="properties-label" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Intelligence Attributes</h3>
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                                {Object.entries(selectedEntity.properties).map(([key, value]) => (<div key={key} className="flex justify-between text-sm items-center border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                                        <span className="text-slate-500 font-medium capitalize">{key}</span>
                                        <span className="font-semibold text-slate-800">{String(value)}</span>
                                    </div>))}
                            </div>
                        </section>

                        <div className="pt-2 flex flex-col gap-2">
                            <Button_1.Button variant="outline" className="w-full justify-start" onClick={handleEnrich}>
                                <lucide_react_1.Zap className="h-4 w-4 mr-2 text-blue-600" aria-hidden="true"/>
                                Deep Enrich Entity
                            </Button_1.Button>
                            <Button_1.Button variant="ghost" className="w-full justify-start text-slate-500">
                                <lucide_react_1.Download className="h-4 w-4 mr-2" aria-hidden="true"/>
                                Export Evidence PDF
                            </Button_1.Button>
                        </div>
                    </div>
                </div>) : (<div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 text-center text-slate-400">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <lucide_react_1.Info className="h-6 w-6 lg:h-8 lg:w-8 text-slate-300" aria-hidden="true"/>
                    </div>
                    <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-1">Intelligence View</h3>
                    <p className="text-xs lg:text-sm text-slate-500 max-w-[200px]">Select a node on the Org Mesh to view detailed telemetry and drift status.</p>
                </div>)}
        </aside>
      </div>
    </div>);
}
