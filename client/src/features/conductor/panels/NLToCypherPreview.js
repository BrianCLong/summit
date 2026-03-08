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
exports.NLToCypherPreview = NLToCypherPreview;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
async function fetchNL2Cypher(task) {
    const api = import.meta.env.VITE_NL2CYPHER_API;
    if (api) {
        const res = await fetch(api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task }),
        });
        if (!res.ok)
            throw new Error('nl2cypher api error');
        return res.json();
    }
    // Fallback: dev mock
    const mock = {
        query: `// MATCH (n)-[r]->(m) WHERE n.name CONTAINS '${task}' RETURN n,r,m LIMIT 50`,
        estRows: 42,
        estCost: '~$0.002',
    };
    await new Promise((r) => setTimeout(r, 250));
    return mock;
}
function NLToCypherPreview() {
    const [task, setTask] = (0, react_1.useState)('Show entities related to Project Atlas in last 30 days');
    const [query, setQuery] = (0, react_1.useState)('');
    const [estRows, setEstRows] = (0, react_1.useState)(null);
    const [estCost, setEstCost] = (0, react_1.useState)('');
    const [ts, setTs] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const disabled = !task.trim();
    async function preview() {
        try {
            setLoading(true);
            const out = await fetchNL2Cypher(task);
            setQuery(out.query);
            setEstRows(out.estRows);
            setEstCost(out.estCost);
            setTs(new Date().toLocaleTimeString());
        }
        finally {
            setLoading(false);
        }
    }
    (0, react_1.useEffect)(() => {
        // Auto-preview once on mount using the default task
        preview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (<material_1.Card>
      <material_1.CardContent>
        <material_1.Typography variant="h6" gutterBottom>
          NL → Cypher Preview (Confirm before execute)
        </material_1.Typography>
        <material_1.Box sx={{ display: 'grid', gap: 2 }}>
          <material_1.TextField label="Task" fullWidth value={task} onChange={(e) => setTask(e.target.value)} multiline minRows={2}/>
          <material_1.Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <material_1.Button variant="contained" onClick={preview} disabled={disabled || loading}>
              {loading ? 'Generating…' : 'Preview Query'}
            </material_1.Button>
            {ts && <material_1.Chip size="small" label={`Last updated ${ts}`}/>}
            {estRows != null && (<material_1.Chip size="small" label={`~${estRows} rows`}/>)}
            {estCost && <material_1.Chip size="small" label={`est cost ${estCost}`}/>}
          </material_1.Box>
          <material_1.TextField label="Generated Query" fullWidth value={query} minRows={3} multiline InputProps={{ readOnly: true }}/>
        </material_1.Box>
      </material_1.CardContent>
    </material_1.Card>);
}
