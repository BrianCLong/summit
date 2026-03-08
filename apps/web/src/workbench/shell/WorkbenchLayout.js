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
exports.WorkbenchShell = WorkbenchShell;
const react_1 = __importStar(require("react"));
const viewStore_1 = require("../store/viewStore");
const LinkAnalysisCanvas_1 = require("../canvas/LinkAnalysisCanvas");
const InspectorPanel_1 = require("../inspector/InspectorPanel");
const Button_1 = require("@/components/ui/Button");
const lucide_react_1 = require("lucide-react");
// Mock Data for Shell Dev
const MOCK_NODES = [
    { id: '1', name: 'John Doe', type: 'PERSON', confidence: 0.9, properties: {}, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    { id: '2', name: 'Acme Corp', type: 'ORGANIZATION', confidence: 0.95, properties: {}, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    { id: '3', name: 'Project X', type: 'PROJECT', confidence: 0.8, properties: {}, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];
const MOCK_EDGES = [
    { id: 'e1', sourceId: '1', targetId: '2', type: 'WORKS_FOR', confidence: 0.9, properties: {}, createdAt: '2026-01-01T00:00:00Z', direction: 'directed' },
    { id: 'e2', sourceId: '1', targetId: '3', type: 'RELATED_TO', confidence: 0.7, properties: {}, createdAt: '2026-01-01T00:00:00Z', direction: 'directed' },
];
function WorkbenchShell() {
    const { leftRailOpen, toggleLeftRail, rightRailOpen, toggleRightRail, saveView } = (0, viewStore_1.useWorkbenchStore)();
    // In a real app, these would come from a query hook
    const [nodes] = (0, react_1.useState)(MOCK_NODES);
    const [edges] = (0, react_1.useState)(MOCK_EDGES);
    const handleSaveView = () => {
        saveView({
            id: crypto.randomUUID(),
            name: `Snapshot ${new Date().toLocaleTimeString()}`,
            timestamp: Date.now(),
            state: {
                nodes,
                edges,
                transform: { x: 0, y: 0, k: 1 },
                filters: { types: [], timeRange: null },
                selection: []
            }
        });
    };
    return (<div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Header / Toolbar could go here */}

      {/* Left Rail: Context/Case */}
      <aside className={`
          border-r bg-muted/10 transition-all duration-300 ease-in-out flex flex-col
          ${leftRailOpen ? 'w-64' : 'w-0 opacity-0 overflow-hidden'}
        `}>
        <div className="p-4 border-b font-semibold flex justify-between items-center">
          <span>Case Files</span>
        </div>
        <div className="p-4 flex-1">
          <div className="text-sm text-muted-foreground">Case Context</div>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="p-2 bg-accent rounded cursor-pointer">Operation Chimera</li>
            <li className="p-2 hover:bg-muted rounded cursor-pointer">Suspicious Flows</li>
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-12 border-b flex items-center px-4 justify-between bg-card">
          <div className="flex items-center gap-2">
            <Button_1.Button variant="ghost" size="icon" onClick={toggleLeftRail}>
              <lucide_react_1.PanelLeft className="h-4 w-4"/>
            </Button_1.Button>
            <span className="font-medium text-sm">Investigator Workbench</span>
          </div>

          <div className="flex items-center gap-2">
             <Button_1.Button variant="outline" size="sm" onClick={handleSaveView}>
               <lucide_react_1.Save className="h-4 w-4 mr-2"/>
               Save View
             </Button_1.Button>
             <Button_1.Button variant="ghost" size="icon" onClick={toggleRightRail}>
              <lucide_react_1.PanelRight className="h-4 w-4"/>
            </Button_1.Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
           <LinkAnalysisCanvas_1.LinkAnalysisCanvas nodes={nodes} edges={edges}/>
        </div>
      </main>

      {/* Right Rail: Inspector */}
      <aside className={`
          border-l bg-muted/10 transition-all duration-300 ease-in-out flex flex-col
          ${rightRailOpen ? 'w-80' : 'w-0 opacity-0 overflow-hidden'}
        `}>
        <InspectorPanel_1.InspectorPanel entities={nodes}/>
      </aside>
    </div>);
}
