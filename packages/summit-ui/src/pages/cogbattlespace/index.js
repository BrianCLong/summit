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
exports.default = CognitiveBattlespacePage;
const react_1 = __importStar(require("react"));
const LayerToggle_1 = require("../../components/cogbattlespace/LayerToggle");
const MetricsPanel_1 = require("../../components/cogbattlespace/MetricsPanel");
const ExplainDrawer_1 = require("../../components/cogbattlespace/ExplainDrawer");
// Replace these with your real API client
async function fetchTopNarratives() {
    return [];
}
async function fetchDivergence() {
    return [];
}
function CognitiveBattlespacePage() {
    const [layers, setLayers] = (0, react_1.useState)({
        reality: true,
        narrative: true,
        belief: true
    });
    const [narratives, setNarratives] = (0, react_1.useState)([]);
    const [divergence, setDivergence] = (0, react_1.useState)([]);
    const [drawerOpen, setDrawerOpen] = (0, react_1.useState)(false);
    const [drawerTitle, setDrawerTitle] = (0, react_1.useState)("Explain");
    const [drawerBody, setDrawerBody] = (0, react_1.useState)("");
    const [drawerDisclaimers, setDrawerDisclaimers] = (0, react_1.useState)([]);
    react_1.default.useEffect(() => {
        (async () => {
            setNarratives(await fetchTopNarratives());
            setDivergence(await fetchDivergence());
        })();
    }, []);
    const enabledLayers = (0, react_1.useMemo)(() => Object.entries(layers).filter(([, v]) => v).map(([k]) => k), [layers]);
    const explain = async (narrativeId) => {
        // Stubbed explain content; wire to summit-cogbattlespace explainDivergence endpoint later
        setDrawerTitle(`Explain: ${narrativeId}`);
        setDrawerBody([
            "This view is analytic/defensive.",
            "It explains why a narrative was flagged and what evidence-backed claims it may conflict with.",
            "",
            "No counter-messaging guidance is generated."
        ].join("\n"));
        setDrawerDisclaimers([
            "Analytic/defensive only: no persuasion or targeting guidance.",
            "Heuristic scores; review artifacts + evidence.",
            "Association is not causation."
        ]);
        setDrawerOpen(true);
    };
    return (<div className="p-6 grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cognitive Battlespace</h1>
          <div className="text-sm opacity-70 mt-1">
            Layers enabled: {enabledLayers.join(", ")}
          </div>
        </div>
        <LayerToggle_1.LayerToggle enabled={layers} onChange={setLayers}/>
      </div>

      {/* Placeholder for map/graph canvas */}
      <div className="rounded-2xl border p-6 min-h-[260px]">
        <div className="text-sm opacity-70">
          Canvas placeholder (graph/map). Wire to IntelGraph/H3/Map layers later.
        </div>
        <div className="mt-3 text-sm">
          Reality / Narrative / Belief layers are toggled above; this canvas will render the chosen overlays.
        </div>
      </div>

      <MetricsPanel_1.MetricsPanel narratives={narratives} divergence={divergence} onExplain={explain}/>

      <ExplainDrawer_1.ExplainDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerTitle} body={drawerBody} disclaimers={drawerDisclaimers}/>
    </div>);
}
