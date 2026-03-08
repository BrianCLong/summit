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
exports.default = ExportAuditBundleButton;
const react_1 = __importStar(require("react"));
function ExportAuditBundleButton(props) {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const { href, label } = (0, react_1.useMemo)(() => {
        if ('investigationId' in props) {
            return {
                href: `/audit/investigations/${props.investigationId}/audit-bundle.zip`,
                label: 'Download Audit Bundle',
            };
        }
        return {
            href: `/audit/incidents/${props.incidentId}/audit-bundle.zip`,
            label: 'Download Audit Bundle',
        };
    }, [props]);
    return (<button onClick={() => setLoading(true)} className="rounded-xl px-3 py-2 border shadow-sm hover:shadow bg-white" disabled={loading} title="Export includes IDs, hashes, and metadata (reasonCode, appealUrl). Sensitive payloads excluded.">
      {loading ? 'Preparing…' : label}
      {/* Hidden link to trigger download in a new tab without blocking UI */}
      <a href={href} className="hidden" target="_blank" rel="noreferrer" onLoad={() => setLoading(false)}/>
    </button>);
}
