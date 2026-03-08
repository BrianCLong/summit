"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CypherPreview = void 0;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const CypherPreview = ({ cypher, onChange, onRun, loading }) => {
    return (<material_1.Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <material_1.TextField label="Cypher Query" multiline rows={6} value={cypher} onChange={(e) => onChange(e.target.value)} fullWidth InputProps={{
            style: { fontFamily: 'monospace' }
        }}/>
      <material_1.Button variant="contained" color="secondary" onClick={() => onRun(cypher)} disabled={!cypher.trim() || loading} startIcon={loading ? <material_1.CircularProgress size={20}/> : null}>
        Run Query
      </material_1.Button>
    </material_1.Box>);
};
exports.CypherPreview = CypherPreview;
