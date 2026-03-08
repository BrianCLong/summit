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
exports.default = APIDocs;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
function APIDocs() {
    const src = (0, react_1.useMemo)(() => {
        const origin = window.location.origin;
        // In dev, server runs on 4000, UI on 3000.
        const serverOrigin = origin.includes(':3000')
            ? origin.replace(':3000', ':4000')
            : origin;
        return `${serverOrigin}/docs/openapi`;
    }, []);
    return (<material_1.Box sx={{ height: 'calc(100vh - 96px)' }}>
      <material_1.Typography variant="h4" sx={{ mb: 2 }}>
        API Documentation
      </material_1.Typography>
      <material_1.Box sx={{ border: '1px solid #ddd', borderRadius: 1, height: '100%' }}>
        <iframe title="OpenAPI Docs" src={src} style={{ width: '100%', height: '100%', border: '0' }}/>
      </material_1.Box>
    </material_1.Box>);
}
