"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ObservabilityPage;
const react_1 = __importDefault(require("react"));
const GrafanaPanel_1 = __importDefault(require("../components/GrafanaPanel"));
function ObservabilityPage() {
    const cfg = window.__MAESTRO_CFG__ || {};
    const uids = cfg.grafanaDashboards || {
        overview: 'maestro-overview',
        slo: 'maestro-slo',
        cost: 'maestro-cost',
    };
    return (<div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Observability</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <GrafanaPanel_1.default uid={uids.overview} title="Overview"/>
        <GrafanaPanel_1.default uid={uids.slo} title="SLOs"/>
        <GrafanaPanel_1.default uid={uids.cost} title="Cost"/>
      </div>
    </div>);
}
