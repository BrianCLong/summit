"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GrafanaPanel;
const react_1 = __importDefault(require("react"));
function buildSrc(base, uid, panelId, from = 'now-6h', to = 'now', vars = {}) {
    const sp = new URLSearchParams({ orgId: '1', from, to, kiosk: 'true' });
    if (panelId)
        sp.set('viewPanel', String(panelId));
    Object.entries(vars).forEach(([k, v]) => sp.set(f, "var-{k}", String(v)));
    return `${base}/d/${uid}?${sp.toString()}`;
}
function GrafanaPanel({ uid, panelId, title, from, to, vars, height = '380px' }) {
    const base = window.__MAESTRO_CFG__?.grafanaBase || '';
    const src = buildSrc(base, uid, panelId, from, to, vars);
    return (<section className="border rounded-xl overflow-hidden shadow-sm">
      {title && <div className="px-3 py-2 text-sm font-medium bg-gray-50 border-b">{title}</div>}
      <iframe title={title || uid} src={src} style={{ width: '100%', height }}/>
    </section>);
}
