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
exports.PolicyProfileSelector = PolicyProfileSelector;
const react_1 = __importStar(require("react"));
const AuthContext_1 = require("@/contexts/AuthContext");
const Button_1 = require("@/components/ui/Button");
const RadioGroup_1 = require("@/components/ui/RadioGroup");
const label_1 = require("@/components/ui/label");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const lucide_react_1 = require("lucide-react");
function PolicyProfileSelector({ tenantId, currentProfile, onSuccess }) {
    (0, AuthContext_1.useAuth)();
    const token = localStorage.getItem('auth_token');
    const [profiles, setProfiles] = (0, react_1.useState)([]);
    const [selectedProfile, setSelectedProfile] = (0, react_1.useState)(currentProfile || 'baseline');
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [applying, setApplying] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const fetchProfiles = async () => {
            try {
                const res = await fetch('/api/policy-profiles', {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                const json = await res.json();
                if (json.success) {
                    setProfiles(json.data);
                }
                else {
                    setError(json.error || 'Failed to load profiles');
                }
            }
            catch (e) {
                setError('Network error loading profiles');
            }
            finally {
                setLoading(false);
            }
        };
        fetchProfiles();
    }, [token]);
    const handleApply = async () => {
        setApplying(true);
        setError(null);
        try {
            const res = await fetch(`/api/tenants/${tenantId}/policy-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ profileId: selectedProfile })
            });
            const json = await res.json();
            if (json.success) {
                onSuccess();
            }
            else {
                setError(json.error || 'Failed to apply policy');
            }
        }
        catch (e) {
            setError('Network error applying policy');
        }
        finally {
            setApplying(false);
        }
    };
    if (loading)
        return <div>Loading profiles...</div>;
    if (error)
        return <div className="text-destructive">{error}</div>;
    return (<div className="space-y-6 py-4">
      <RadioGroup_1.RadioGroup value={selectedProfile} onValueChange={setSelectedProfile} className="space-y-4">
        {profiles.map((profile) => (<div key={profile.id} className="flex items-start space-x-3 space-y-0">
            <RadioGroup_1.RadioGroupItem value={profile.id} id={profile.id} className="mt-1"/>
            <label_1.Label htmlFor={profile.id} className="flex-1 cursor-pointer">
              <Card_1.Card className={`border-2 ${selectedProfile === profile.id ? 'border-primary' : 'border-transparent'}`}>
                <Card_1.CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{profile.name}</span>
                    {selectedProfile === profile.id && <lucide_react_1.CheckCircle2 className="h-4 w-4 text-primary"/>}
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.description}</p>
                  <div className="flex gap-2">
                    {profile.guardrails.requirePurpose && (<Badge_1.Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                             <lucide_react_1.ShieldAlert className="h-3 w-3 mr-1"/> Purpose Required
                        </Badge_1.Badge>)}
                    {profile.guardrails.requireJustification && (<Badge_1.Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                             <lucide_react_1.ShieldAlert className="h-3 w-3 mr-1"/> Justification Required
                        </Badge_1.Badge>)}
                  </div>
                </Card_1.CardContent>
              </Card_1.Card>
            </label_1.Label>
          </div>))}
      </RadioGroup_1.RadioGroup>

      <div className="flex justify-end gap-3 pt-4">
        <Button_1.Button onClick={handleApply} disabled={applying || selectedProfile === currentProfile}>
          {applying ? 'Applying...' : 'Apply Profile'}
        </Button_1.Button>
      </div>
    </div>);
}
