"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GrafanaPanel;
const react_1 = __importDefault(require("react"));
function GrafanaPanel({ uid, vars = {}, }) {
    const cfg = window.__MAESTRO_CFG__ || {};
    const base = cfg.grafanaBase;
    if (!base) {
        return (<div className="rounded border p-3 text-sm text-slate-500">
        Configure window.__MAESTRO_CFG__.grafanaBase to embed Grafana panel{' '}
        {uid}.
      </div>);
    }
    const params = new URLSearchParams();
    params.set('orgId', '1');
    params.set('kiosk', '');
    params.set('refresh', '30s');
    Object.entries(vars || {}).forEach(([k, v]) => params.set(`var-${k}`, String(v)));
    const src = `${base.replace(/\/$/, '')}/d/${encodeURIComponent(uid)}?${params.toString()}`;
    return (<iframe title={`Grafana ${uid}`} src={src} className="w-full" style={{ height: 360, border: 0, borderRadius: 12 }} sandbox="allow-same-origin allow-scripts allow-popups"/>);
}
