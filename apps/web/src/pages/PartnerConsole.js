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
exports.default = PartnerConsole;
const react_1 = __importStar(require("react"));
const AuthContext_1 = require("@/contexts/AuthContext");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const Table_1 = require("@/components/ui/Table");
const Badge_1 = require("@/components/ui/Badge");
const PolicyProfileSelector_1 = require("@/components/PolicyProfileSelector");
const Dialog_1 = require("@/components/ui/Dialog");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const lucide_react_1 = require("lucide-react");
function PartnerConsole() {
    const { user } = (0, AuthContext_1.useAuth)();
    const token = localStorage.getItem('auth_token');
    const [tenants, setTenants] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [selectedTenant, setSelectedTenant] = (0, react_1.useState)(null);
    const [isPolicyDialogOpen, setIsPolicyDialogOpen] = (0, react_1.useState)(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = (0, react_1.useState)(false);
    const [newTenant, setNewTenant] = (0, react_1.useState)({ name: '', slug: '', residency: 'US' });
    // Note: In a real app, this should probably be paginated
    const fetchTenants = async () => {
        try {
            const res = await fetch('/api/tenants', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const json = await res.json();
            if (json.success) {
                setTenants(json.data);
            }
            else {
                console.error('Failed to fetch tenants:', json.error);
                setTenants([]);
            }
            setLoading(false);
        }
        catch (error) {
            console.error('Failed to fetch tenants', error);
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchTenants();
    }, [token]);
    const handlePolicyApplied = () => {
        setIsPolicyDialogOpen(false);
        fetchTenants(); // Refresh list
    };
    const handleCreateTenant = async () => {
        try {
            const res = await fetch('/api/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newTenant)
            });
            const json = await res.json();
            if (json.success) {
                setIsCreateDialogOpen(false);
                setNewTenant({ name: '', slug: '', residency: 'US' });
                fetchTenants();
            }
            else {
                console.error('Failed to create tenant', json.error);
            }
        }
        catch (e) {
            console.error('Network error creating tenant', e);
        }
    };
    if (loading)
        return <div>Loading...</div>;
    return (<div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partner Console</h1>
          <p className="text-muted-foreground">Manage tenants and security policies.</p>
        </div>
        <Dialog_1.Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <Dialog_1.DialogTrigger asChild>
                <Button_1.Button>
                  <lucide_react_1.Plus className="mr-2 h-4 w-4"/> Create Tenant
                </Button_1.Button>
            </Dialog_1.DialogTrigger>
            <Dialog_1.DialogContent>
                <Dialog_1.DialogHeader>
                    <Dialog_1.DialogTitle>Create New Tenant</Dialog_1.DialogTitle>
                </Dialog_1.DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label_1.Label htmlFor="name">Tenant Name</label_1.Label>
                        <input_1.Input id="name" value={newTenant.name} onChange={e => setNewTenant({ ...newTenant, name: e.target.value })} placeholder="Acme Corp"/>
                    </div>
                    <div className="space-y-2">
                        <label_1.Label htmlFor="slug">Slug (URL)</label_1.Label>
                        <input_1.Input id="slug" value={newTenant.slug} onChange={e => setNewTenant({ ...newTenant, slug: e.target.value })} placeholder="acme"/>
                    </div>
                    <div className="space-y-2">
                        <label_1.Label htmlFor="residency">Residency</label_1.Label>
                        <select id="residency" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={newTenant.residency} onChange={e => setNewTenant({ ...newTenant, residency: e.target.value })}>
                            <option value="US">United States (US)</option>
                            <option value="EU">Europe (EU)</option>
                        </select>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button_1.Button onClick={handleCreateTenant}>Create Tenant</Button_1.Button>
                    </div>
                </div>
            </Dialog_1.DialogContent>
        </Dialog_1.Dialog>
      </div>

      <Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle>Tenants</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <Table_1.Table>
            <Table_1.TableHeader>
              <Table_1.TableRow>
                <Table_1.TableHead>Name</Table_1.TableHead>
                <Table_1.TableHead>Slug</Table_1.TableHead>
                <Table_1.TableHead>Status</Table_1.TableHead>
                <Table_1.TableHead>Policy Profile</Table_1.TableHead>
                <Table_1.TableHead className="text-right">Actions</Table_1.TableHead>
              </Table_1.TableRow>
            </Table_1.TableHeader>
            <Table_1.TableBody>
              {tenants.map((tenant) => (<Table_1.TableRow key={tenant.id}>
                  <Table_1.TableCell className="font-medium">{tenant.name}</Table_1.TableCell>
                  <Table_1.TableCell>{tenant.slug}</Table_1.TableCell>
                  <Table_1.TableCell>
                    <Badge_1.Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                      {tenant.status}
                    </Badge_1.Badge>
                  </Table_1.TableCell>
                  <Table_1.TableCell>
                    <Badge_1.Badge variant="outline">{tenant.settings.policy_profile || 'None'}</Badge_1.Badge>
                  </Table_1.TableCell>
                  <Table_1.TableCell className="text-right">
                    <Dialog_1.Dialog open={isPolicyDialogOpen && selectedTenant === tenant.id} onOpenChange={(open) => {
                setIsPolicyDialogOpen(open);
                if (open)
                    setSelectedTenant(tenant.id);
                else
                    setSelectedTenant(null);
            }}>
                      <Dialog_1.DialogTrigger asChild>
                        <Button_1.Button variant="ghost" size="sm" onClick={() => setSelectedTenant(tenant.id)}>
                          Change Policy
                        </Button_1.Button>
                      </Dialog_1.DialogTrigger>
                      <Dialog_1.DialogContent>
                        <Dialog_1.DialogHeader>
                          <Dialog_1.DialogTitle>Apply Policy Profile - {tenant.name}</Dialog_1.DialogTitle>
                        </Dialog_1.DialogHeader>
                        <PolicyProfileSelector_1.PolicyProfileSelector tenantId={tenant.id} currentProfile={tenant.settings.policy_profile} onSuccess={handlePolicyApplied}/>
                      </Dialog_1.DialogContent>
                    </Dialog_1.Dialog>
                  </Table_1.TableCell>
                </Table_1.TableRow>))}
            </Table_1.TableBody>
          </Table_1.Table>
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
}
