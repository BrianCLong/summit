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
exports.default = FeatureFlagsPage;
// @ts-nocheck
const react_1 = __importStar(require("react"));
const AuthContext_1 = require("@/contexts/AuthContext");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const switch_1 = require("@/components/ui/switch");
const Dialog_1 = require("@/components/ui/Dialog");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const select_1 = require("@/components/ui/select");
const textarea_1 = require("@/components/ui/textarea");
const FeatureFlagContext_1 = require("@/contexts/FeatureFlagContext");
const lucide_react_1 = require("lucide-react");
function FeatureFlagsPage() {
    const { token } = (0, AuthContext_1.useAuth)();
    const { reloadFlags } = (0, FeatureFlagContext_1.useFeatureFlags)();
    const [flags, setFlags] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [isDialogOpen, setIsDialogOpen] = (0, react_1.useState)(false);
    const [editingFlag, setEditingFlag] = (0, react_1.useState)(null);
    const [formData, setFormData] = (0, react_1.useState)({
        type: 'boolean',
        enabled: false,
        defaultValue: false
    });
    const fetchFlags = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/feature-flags', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFlags(data);
            }
        }
        catch (error) {
            console.error('Failed to fetch flags', error);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchFlags();
    }, [token]);
    const handleSave = async () => {
        try {
            const url = '/api/feature-flags';
            const method = 'POST'; // We use POST for create and update (upsert)
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsDialogOpen(false);
                fetchFlags();
                reloadFlags(); // Refresh context
                setEditingFlag(null);
                setFormData({ type: 'boolean', enabled: false, defaultValue: false });
            }
        }
        catch (error) {
            console.error('Failed to save flag', error);
        }
    };
    const handleDelete = async (key) => {
        if (!confirm('Are you sure you want to delete this flag?'))
            return;
        try {
            await fetch(`/api/feature-flags/${key}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchFlags();
            reloadFlags();
        }
        catch (error) {
            console.error('Failed to delete flag', error);
        }
    };
    const openEdit = (flag) => {
        setEditingFlag(flag);
        setFormData(flag);
        setIsDialogOpen(true);
    };
    const openCreate = () => {
        setEditingFlag(null);
        setFormData({ type: 'boolean', enabled: false, defaultValue: false });
        setIsDialogOpen(true);
    };
    return (<div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">Manage application features and configuration.</p>
        </div>
        <div className="flex gap-2">
          <Button_1.Button variant="outline" onClick={() => { fetchFlags(); reloadFlags(); }}>
            <lucide_react_1.RefreshCw className="h-4 w-4 mr-2"/>
            Refresh
          </Button_1.Button>
          <Button_1.Button onClick={openCreate}>
            <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
            Create Flag
          </Button_1.Button>
        </div>
      </div>

      {loading ? (<div className="flex justify-center p-8">
          <lucide_react_1.Loader2 className="h-8 w-8 animate-spin"/>
        </div>) : (<div className="grid gap-4">
          {flags.map(flag => (<Card_1.Card key={flag.key} className="flex flex-row items-center p-4 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{flag.key}</h3>
                  <Badge_1.Badge variant={flag.enabled ? 'default' : 'secondary'}>
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </Badge_1.Badge>
                  <Badge_1.Badge variant="outline">{flag.type}</Badge_1.Badge>
                  {flag.tenantId && <Badge_1.Badge variant="outline" className="bg-yellow-50 text-yellow-700">Tenant: {flag.tenantId}</Badge_1.Badge>}
                </div>
                <p className="text-sm text-gray-500">{flag.description || 'No description'}</p>
                <div className="text-xs text-gray-400 mt-1">
                  Default: {JSON.stringify(flag.defaultValue)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button_1.Button variant="ghost" size="sm" onClick={() => openEdit(flag)}>
                  <lucide_react_1.Edit2 className="h-4 w-4"/>
                </Button_1.Button>
                <Button_1.Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(flag.key)}>
                  <lucide_react_1.Trash2 className="h-4 w-4"/>
                </Button_1.Button>
              </div>
            </Card_1.Card>))}
          {flags.length === 0 && (<div className="text-center p-8 border border-dashed rounded-lg text-gray-500">
              No feature flags found. Create one to get started.
            </div>)}
        </div>)}

      <Dialog_1.Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog_1.DialogContent className="sm:max-w-[500px]">
          <Dialog_1.DialogHeader>
            <Dialog_1.DialogTitle>{editingFlag ? 'Edit Flag' : 'Create New Flag'}</Dialog_1.DialogTitle>
          </Dialog_1.DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label_1.Label htmlFor="key">Key</label_1.Label>
              <input_1.Input id="key" value={formData.key || ''} onChange={e => setFormData({ ...formData, key: e.target.value })} disabled={!!editingFlag} placeholder="feature.name"/>
            </div>
            <div className="grid gap-2">
              <label_1.Label htmlFor="description">Description</label_1.Label>
              <textarea_1.Textarea id="description" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label_1.Label htmlFor="type">Type</label_1.Label>
                <select_1.Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })} disabled={!!editingFlag}>
                  <select_1.SelectTrigger>
                    <select_1.SelectValue />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="boolean">Boolean</select_1.SelectItem>
                    <select_1.SelectItem value="string">String</select_1.SelectItem>
                    <select_1.SelectItem value="number">Number</select_1.SelectItem>
                    <select_1.SelectItem value="json">JSON</select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
              </div>
              <div className="grid gap-2">
                <label_1.Label htmlFor="enabled">State</label_1.Label>
                <div className="flex items-center space-x-2 h-10">
                  <switch_1.Switch id="enabled" checked={formData.enabled} onCheckedChange={checked => setFormData({ ...formData, enabled: checked })}/>
                  <label_1.Label htmlFor="enabled">{formData.enabled ? 'Enabled' : 'Disabled'}</label_1.Label>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <label_1.Label htmlFor="defaultValue">Default Value</label_1.Label>
              {formData.type === 'boolean' ? (<switch_1.Switch checked={formData.defaultValue} onCheckedChange={checked => setFormData({ ...formData, defaultValue: checked })}/>) : (<input_1.Input id="defaultValue" value={typeof formData.defaultValue === 'object' ? JSON.stringify(formData.defaultValue) : formData.defaultValue} onChange={e => {
                let val = e.target.value;
                if (formData.type === 'number')
                    val = Number(val);
                if (formData.type === 'json') {
                    try {
                        val = JSON.parse(val);
                    }
                    catch (e) { }
                }
                setFormData({ ...formData, defaultValue: val });
            }}/>)}
            </div>

            <div className="grid gap-2">
              <label_1.Label htmlFor="tenantId">Tenant ID (Optional)</label_1.Label>
              <input_1.Input id="tenantId" value={formData.tenantId || ''} onChange={e => setFormData({ ...formData, tenantId: e.target.value })} placeholder="Global if empty"/>
            </div>
          </div>
          <Dialog_1.DialogFooter>
            <Button_1.Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button_1.Button>
            <Button_1.Button onClick={handleSave}>Save</Button_1.Button>
          </Dialog_1.DialogFooter>
        </Dialog_1.DialogContent>
      </Dialog_1.Dialog>
    </div>);
}
