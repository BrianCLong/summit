"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveBattlespacePage = CognitiveBattlespacePage;
const react_1 = __importDefault(require("react"));
const ExplainDrawer_1 = require("../../components/cognitive-battlespace/ExplainDrawer");
const LayerToggle_1 = require("../../components/cognitive-battlespace/LayerToggle");
const MetricsPanel_1 = require("../../components/cognitive-battlespace/MetricsPanel");
const RejectionReportPanel_1 = require("../../components/cognitive-battlespace/RejectionReportPanel");
const stubNarratives = [
    {
        id: 'narrative_sanctions',
        label: 'Sanctions collapsing EU economy',
        summary: 'Velocity and amplification are rising in Telegram and repost channels.',
        metrics: { velocity: 0.31 },
    },
];
const stubDivergence = [
    { narrativeId: 'narrative_sanctions', claimId: 'claim_gdp', divergenceScore: 0.82 },
];
const stubReport = {
    ok: false,
    writesetId: 'ws_demo_20260305',
    summary: { receivedOps: 3, acceptedOps: 2, rejectedOps: 1 },
    items: [
        { opId: 'op1', status: 'ACCEPTED', domain: 'NG' },
        {
            opId: 'op2',
            status: 'REJECTED',
            domain: 'NG',
            errors: [{ code: 'DOMAIN_MISMATCH', message: 'Belief must be BG' }],
        },
    ],
};
function CognitiveBattlespacePage() {
    const [layers, setLayers] = react_1.default.useState({
        reality: true,
        narrative: true,
        belief: true,
    });
    const [open, setOpen] = react_1.default.useState(false);
    return (<section className="space-y-4 rounded-2xl border border-sand/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cognitive Battlespace</h2>
          <p className="text-xs text-sand/70">Tri-Graph overlay: Reality · Narrative · Belief</p>
        </div>
        <LayerToggle_1.LayerToggle enabled={layers} onChange={setLayers}/>
      </div>

      <div className="rounded-xl border border-sand/20 p-4 text-sm text-sand/70">
        Canvas placeholder for graph + map overlays. Current layers:{' '}
        {Object.entries(layers)
            .filter(([, enabled]) => enabled)
            .map(([layer]) => layer)
            .join(', ')}
      </div>

      <MetricsPanel_1.MetricsPanel narratives={stubNarratives} divergence={stubDivergence} onExplain={() => setOpen(true)}/>

      <RejectionReportPanel_1.RejectionReportPanel report={stubReport}/>

      <ExplainDrawer_1.ExplainDrawer open={open} onClose={() => setOpen(false)} title="Defensive explanation" body="This panel explains why a narrative diverges from an evidence-backed claim." disclaimers={[
            'Analytic and defensive use only.',
            'No persuasion or targeting guidance is generated.',
            'Association does not imply causation.',
        ]}/>
    </section>);
}
