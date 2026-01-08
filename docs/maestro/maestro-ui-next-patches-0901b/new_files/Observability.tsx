import React from "react";
import GrafanaPanel from "../components/GrafanaPanel";

export default function ObservabilityPage() {
  const cfg = (window as any).__MAESTRO_CFG__ || {};
  const uids = cfg.grafanaDashboards || {
    overview: "maestro-overview",
    slo: "maestro-slo",
    cost: "maestro-cost",
  };
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Observability</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <GrafanaPanel uid={uids.overview} title="Overview" />
        <GrafanaPanel uid={uids.slo} title="SLOs" />
        <GrafanaPanel uid={uids.cost} title="Cost" />
      </div>
    </div>
  );
}
