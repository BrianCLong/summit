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
exports.default = ExecutorsPage;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
function ExecutorsPage() {
    const [list, setList] = (0, react_1.useState)([]);
    const [name, setName] = (0, react_1.useState)('pool-1');
    const [kind, setKind] = (0, react_1.useState)('cpu');
    const [labels, setLabels] = (0, react_1.useState)('ci,build');
    const [capacity, setCapacity] = (0, react_1.useState)(1);
    const [error, setError] = (0, react_1.useState)('');
    const load = async () => {
        const r = await fetch('/api/maestro/v1/executors');
        setList(await r.json());
    };
    (0, react_1.useEffect)(() => {
        load();
    }, []);
    const create = async () => {
        setError('');
        try {
            const r = await fetch('/api/maestro/v1/executors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    kind,
                    labels: labels
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    capacity,
                    status: 'ready',
                }),
            });
            if (!r.ok)
                throw new Error('create failed');
            await load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'create failed');
        }
    };
    return (<material_1.Box>
      <material_1.Typography variant="h4">Executors</material_1.Typography>
      {error && <material_1.Alert severity="error">{error}</material_1.Alert>}
      <Grid_1.default container spacing={2} sx={{ mt: 1 }}>
        <Grid_1.default xs={12} md={6}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">Register Executor</material_1.Typography>
              <material_1.TextField fullWidth label="Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ my: 1 }}/>
              <material_1.TextField fullWidth label="Kind (cpu/gpu)" value={kind} onChange={(e) => {
            const value = e.target.value;
            if (value === 'cpu' || value === 'gpu') {
                setKind(value);
            }
        }} sx={{ my: 1 }}/>
              <material_1.TextField fullWidth label="Labels (csv)" value={labels} onChange={(e) => setLabels(e.target.value)} sx={{ my: 1 }}/>
              <material_1.TextField fullWidth type="number" label="Capacity" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} sx={{ my: 1 }}/>
              <material_1.Button variant="contained" onClick={create}>
                Create
              </material_1.Button>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
        <Grid_1.default xs={12} md={6}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Typography variant="h6">Pools</material_1.Typography>
              <material_1.List>
                {list.map((e) => (<material_1.ListItem key={e.id}>
                    <material_1.ListItemText primary={`${e.name} (${e.kind})`} secondary={`cap=${e.capacity} labels=${e.labels.join(',')}`}/>
                  </material_1.ListItem>))}
              </material_1.List>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>
    </material_1.Box>);
}
