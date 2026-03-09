import React, { useMemo, useState } from "react";
import { LayerToggle, Layer } from "../../components/cogbattlespace/LayerToggle";
import { MetricsPanel } from "../../components/cogbattlespace/MetricsPanel";
import { ExplainDrawer } from "../../components/cogbattlespace/ExplainDrawer";

// Replace these with your real API client
async function fetchTopNarratives() {
  return [];
}
async function fetchDivergence() {
  return [];
}

export default function CognitiveBattlespacePage() {
  const [layers, setLayers] = useState<Record<Layer, boolean>>({
    reality: true,
    narrative: true,
    belief: true
  });

  const [narratives, setNarratives] = useState<any[]>([]);
  const [divergence, setDivergence] = useState<any[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("Explain");
  const [drawerBody, setDrawerBody] = useState("");
  const [drawerDisclaimers, setDrawerDisclaimers] = useState<string[]>([]);

  React.useEffect(() => {
    (async () => {
      setNarratives(await fetchTopNarratives());
      setDivergence(await fetchDivergence());
    })();
  }, []);

  const enabledLayers = useMemo(
    () => Object.entries(layers).filter(([, v]) => v).map(([k]) => k),
    [layers]
  );

  const explain = async (narrativeId: string) => {
    // Stubbed explain content; wire to summit-cogbattlespace explainDivergence endpoint later
    setDrawerTitle(`Explain: ${narrativeId}`);
    setDrawerBody(
      [
        "This view is analytic/defensive.",
        "It explains why a narrative was flagged and what evidence-backed claims it may conflict with.",
        "",
        "No counter-messaging guidance is generated."
      ].join("\n")
    );
    setDrawerDisclaimers([
      "Analytic/defensive only: no persuasion or targeting guidance.",
      "Heuristic scores; review artifacts + evidence.",
      "Association is not causation."
    ]);
    setDrawerOpen(true);
  };

  return (
    <div className="p-6 grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cognitive Battlespace</h1>
          <div className="text-sm opacity-70 mt-1">
            Layers enabled: {enabledLayers.join(", ")}
          </div>
        </div>
        <LayerToggle enabled={layers} onChange={setLayers} />
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

      <MetricsPanel narratives={narratives} divergence={divergence} onExplain={explain} />

      <ExplainDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        body={drawerBody}
        disclaimers={drawerDisclaimers}
      />
    </div>
  );
}
