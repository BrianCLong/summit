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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TenantObservability;
const react_1 = __importStar(require("react"));
const TenantSLO_1 = __importDefault(require("../components/TenantSLO"));
const TenantSLOChart_1 = __importDefault(require("../components/TenantSLOChart"));
const GrafanaPanel_1 = __importDefault(require("../components/GrafanaPanel"));
function TenantObservability() {
    const [tenant, setTenant] = (0, react_1.useState)('acme');
    const cfg = window.__MAESTRO_CFG__ || window.MAESTRO_CFG || {};
    return (<section className="space-y-3 p-4" aria-label="Tenant observability">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Tenant Observability</h1>
        <input aria-label="Tenant" className="rounded border px-2 py-1" value={tenant} onChange={(e) => setTenant(e.target.value)}/>
      </div>
      <TenantSLO_1.default tenant={tenant}/>
      <TenantSLOChart_1.default tenant={tenant}/>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <GrafanaPanel_1.default uid={cfg?.grafanaDashboards?.slo || 'maestro-slo'} vars={{ tenant }}/>
        <GrafanaPanel_1.default uid={cfg?.grafanaDashboards?.overview || 'maestro-overview'} vars={{ tenant }}/>
        <GrafanaPanel_1.default uid={cfg?.grafanaDashboards?.cost || 'maestro-cost'} vars={{ tenant }}/>
      </div>
    </section>);
}
