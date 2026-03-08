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
exports.default = MCPRegistry;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
function MCPRegistry() {
    const [servers, setServers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [dialogOpen, setDialogOpen] = (0, react_1.useState)(false);
    const [form, setForm] = (0, react_1.useState)({ name: '', url: '', scopes: '', tags: '' });
    const fetchServers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/maestro/v1/mcp/servers');
            const data = await res.json();
            setServers(data);
        }
        catch (e) {
            console.error('Failed to load servers', e);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchServers();
    }, []);
    const createServer = async () => {
        const body = {
            name: form.name.trim(),
            url: form.url.trim(),
            scopes: form.scopes.trim()
                ? form.scopes.split(',').map((s) => s.trim())
                : [],
            tags: form.tags.trim() ? form.tags.split(',').map((s) => s.trim()) : [],
        };
        const res = await fetch('/api/maestro/v1/mcp/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (res.ok) {
            setDialogOpen(false);
            setForm({ name: '', url: '', scopes: '', tags: '' });
            fetchServers();
        }
        else {
            const err = await res.json().catch(() => ({}));
            alert(`Failed to create: ${err.error || res.statusText}`);
        }
    };
    const deleteServer = async (id) => {
        if (!confirm('Delete this MCP server?'))
            return;
        const res = await fetch(`/api/maestro/v1/mcp/servers/${id}`, {
            method: 'DELETE',
        });
        if (res.status === 204)
            fetchServers();
    };
    return (<material_1.Box>
      <material_1.Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
        }}>
        <material_1.Typography variant="h5">MCP Server Registry</material_1.Typography>
        <material_1.Box>
          <material_1.Button startIcon={<icons_material_1.Refresh />} onClick={fetchServers} sx={{ mr: 1 }} disabled={loading}>
            Refresh
          </material_1.Button>
          <material_1.Button startIcon={<icons_material_1.Add />} variant="contained" onClick={() => setDialogOpen(true)}>
            Add Server
          </material_1.Button>
        </material_1.Box>
      </material_1.Box>

      {loading && <material_1.LinearProgress />}

      <material_1.Card>
        <material_1.CardContent>
          <material_1.TableContainer component={material_1.Paper}>
            <material_1.Table>
              <material_1.TableHead>
                <material_1.TableRow>
                  <material_1.TableCell>Name</material_1.TableCell>
                  <material_1.TableCell>URL</material_1.TableCell>
                  <material_1.TableCell>Scopes</material_1.TableCell>
                  <material_1.TableCell>Tags</material_1.TableCell>
                  <material_1.TableCell align="right">Actions</material_1.TableCell>
                </material_1.TableRow>
              </material_1.TableHead>
              <material_1.TableBody>
                {servers.map((s) => (<material_1.TableRow key={s.id}>
                    <material_1.TableCell>{s.name}</material_1.TableCell>
                    <material_1.TableCell>
                      <material_1.Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {s.url}
                      </material_1.Typography>
                    </material_1.TableCell>
                    <material_1.TableCell>
                      {s.scopes?.map((sc) => (<material_1.Chip key={sc} size="small" label={sc} sx={{ mr: 0.5, mb: 0.5 }}/>))}
                    </material_1.TableCell>
                    <material_1.TableCell>
                      {s.tags?.map((t) => (<material_1.Chip key={t} size="small" label={t} color="default" sx={{ mr: 0.5, mb: 0.5 }}/>))}
                    </material_1.TableCell>
                    <material_1.TableCell align="right">
                      <material_1.Tooltip title="Delete">
                        <material_1.IconButton color="error" onClick={() => deleteServer(s.id)}>
                          <icons_material_1.Delete />
                        </material_1.IconButton>
                      </material_1.Tooltip>
                    </material_1.TableCell>
                  </material_1.TableRow>))}
                {servers.length === 0 && !loading && (<material_1.TableRow>
                    <material_1.TableCell colSpan={5}>
                      <material_1.Typography variant="body2">
                        No servers yet. Click "Add Server" to register one.
                      </material_1.Typography>
                    </material_1.TableCell>
                  </material_1.TableRow>)}
              </material_1.TableBody>
            </material_1.Table>
          </material_1.TableContainer>
        </material_1.CardContent>
      </material_1.Card>

      <material_1.Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <material_1.DialogTitle>Register MCP Server</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.TextField fullWidth label="Name" margin="dense" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
          <material_1.TextField fullWidth label="URL (ws:// or wss://)" margin="dense" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}/>
          <material_1.TextField fullWidth label="Scopes (comma separated)" margin="dense" value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })}/>
          <material_1.TextField fullWidth label="Tags (comma separated)" margin="dense" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}/>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setDialogOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained" onClick={createServer}>
            Create
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </material_1.Box>);
}
