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
exports.default = VisualPipelines;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
function VisualPipelines() {
    const [pipelines, setPipelines] = (0, react_1.useState)([]);
    const [name, setName] = (0, react_1.useState)('My Pipeline');
    const [specText, setSpecText] = (0, react_1.useState)('{"nodes":[],"edges":[]}');
    const [hints, setHints] = (0, react_1.useState)([]);
    const [suggestion, setSuggestion] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)('');
    const load = async () => {
        try {
            const r = await fetch('/api/maestro/v1/pipelines');
            setPipelines(await r.json());
        }
        catch {
            /* noop */
        }
    };
    (0, react_1.useEffect)(() => {
        load();
    }, []);
    const create = async () => {
        setError('');
        try {
            const spec = JSON.parse(specText);
            const r = await fetch('/api/maestro/v1/pipelines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, spec }),
            });
            if (!r.ok)
                throw new Error('create failed');
            await load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'create failed');
        }
    };
    const getHints = async () => {
        setHints([]);
        try {
            const spec = JSON.parse(specText);
            const r = await fetch('/api/maestro/v1/pipelines/hints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(spec),
            });
            const data = await r.json();
            setHints('hints' in data && Array.isArray(data.hints) ? data.hints : []);
        }
        catch {
            setHints(['Invalid JSON']);
        }
    };
    const copilot = async () => {
        setSuggestion(null);
        const r = await fetch('/api/maestro/v1/pipelines/copilot/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: name }),
        });
        const data = await r.json();
        setSuggestion(data);
    };
    return (<material_1.Box>
      <material_1.Typography variant="h4" gutterBottom>
        Visual Pipelines
      </material_1.Typography>
      {error && <material_1.Alert severity="error">{error}</material_1.Alert>}
      <Grid_1.default container spacing={2}>
        <Grid_1.default xs={12} md={6}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">Create / Edit</material_1.Typography>
              <material_1.TextField fullWidth label="Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ my: 1 }}/>
              <material_1.TextField fullWidth multiline minRows={8} label="Spec (JSON)" value={specText} onChange={(e) => setSpecText(e.target.value)}/>
              <material_1.Box sx={{ mt: 1 }}>
                <material_1.Button variant="contained" onClick={create} sx={{ mr: 1 }}>
                  Save
                </material_1.Button>
                <material_1.Button onClick={getHints} sx={{ mr: 1 }}>
                  Policy Hints
                </material_1.Button>
                <material_1.Button onClick={copilot}>Copilot Suggest</material_1.Button>
              </material_1.Box>
              {hints.length > 0 && (<material_1.Alert severity="info" sx={{ mt: 2 }}>
                  <ul>
                    {hints.map((h, i) => (<li key={i}>{h}</li>))}
                  </ul>
                </material_1.Alert>)}
              {suggestion && (<material_1.Paper sx={{ p: 1, mt: 2 }}>
                  <material_1.Typography variant="subtitle1">
                    Copilot Suggestion
                  </material_1.Typography>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(suggestion, null, 2)}
                  </pre>
                </material_1.Paper>)}
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
        <Grid_1.default xs={12} md={6}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">Pipelines</material_1.Typography>
              <material_1.List>
                {pipelines.map((p) => (<material_1.ListItem key={p.id}>
                    <material_1.ListItemText primary={p.name} secondary={p.id}/>
                  </material_1.ListItem>))}
              </material_1.List>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>
    </material_1.Box>);
}
