"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceTree = ProvenanceTree;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function Tree({ node, depth = 0 }) {
    return (<material_1.Box sx={{
            ml: depth * 2,
            borderLeft: depth ? '1px solid rgba(0,0,0,0.1)' : 'none',
            pl: 1,
            mb: 0.5,
        }}>
      <material_1.Typography variant="body2">• {node.label}</material_1.Typography>
      {node.children?.map((c) => (<Tree key={c.id} node={c} depth={depth + 1}/>))}
    </material_1.Box>);
}
function ProvenanceTree({ root }) {
    return (<material_1.Card>
      <material_1.CardContent>
        <material_1.Typography variant="h6" gutterBottom>
          Evidence & Provenance
        </material_1.Typography>
        {root ? (<Tree node={root}/>) : (<material_1.Typography variant="body2" color="text.secondary">
            No provenance manifest yet. Run a runbook or import a manifest to
            view source→transform→claim chain.
          </material_1.Typography>)}
      </material_1.CardContent>
    </material_1.Card>);
}
