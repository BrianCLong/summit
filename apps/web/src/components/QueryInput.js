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
exports.QueryInput = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const QueryInput = ({ onPreview, loading = false }) => {
    const [input, setInput] = (0, react_1.useState)('');
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && input.trim() && !loading) {
            e.preventDefault();
            onPreview(input);
        }
    };
    return (<material_1.Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <material_1.TextField label="Natural Language Query" multiline rows={4} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="e.g., Find all people who work for 'Acme Corp'" fullWidth disabled={loading} helperText={<material_1.Typography variant="caption" color="textSecondary">
            Press Ctrl+Enter to generate
          </material_1.Typography>}/>
      <material_1.Button variant="contained" onClick={() => onPreview(input)} disabled={!input.trim() || loading} aria-busy={loading}>
        {loading ? <material_1.CircularProgress size={24} color="inherit"/> : 'Generate Cypher'}
      </material_1.Button>
    </material_1.Box>);
};
exports.QueryInput = QueryInput;
