import React from 'react';
import { ExplainDrawer } from '../../components/cognitive-battlespace/ExplainDrawer';
import { LayerToggle, type Layer } from '../../components/cognitive-battlespace/LayerToggle';
import { MetricsPanel } from '../../components/cognitive-battlespace/MetricsPanel';
import {
  RejectionReportPanel,
  type RejectionReport,
} from '../../components/cognitive-battlespace/RejectionReportPanel';

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

const stubReport: RejectionReport = {
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

export function CognitiveBattlespacePage() {
  const [layers, setLayers] = React.useState<Record<Layer, boolean>>({
    reality: true,
    narrative: true,
    belief: true,
  });
  const [open, setOpen] = React.useState(false);

  return (
    <section className="space-y-4 rounded-2xl border border-sand/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cognitive Battlespace</h2>
          <p className="text-xs text-sand/70">Tri-Graph overlay: Reality · Narrative · Belief</p>
        </div>
        <LayerToggle enabled={layers} onChange={setLayers} />
      </div>

      <div className="rounded-xl border border-sand/20 p-4 text-sm text-sand/70">
        Canvas placeholder for graph + map overlays. Current layers:{' '}
        {Object.entries(layers)
          .filter(([, enabled]) => enabled)
          .map(([layer]) => layer)
          .join(', ')}
      </div>

      <MetricsPanel
        narratives={stubNarratives}
        divergence={stubDivergence}
        onExplain={() => setOpen(true)}
      />

      <RejectionReportPanel report={stubReport} />

      <ExplainDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="Defensive explanation"
        body="This panel explains why a narrative diverges from an evidence-backed claim."
        disclaimers={[
          'Analytic and defensive use only.',
          'No persuasion or targeting guidance is generated.',
          'Association does not imply causation.',
        ]}
      />
    </section>
  );
}
