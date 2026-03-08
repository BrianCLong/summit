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
exports.RiskProfileView = void 0;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const RiskProfileView = () => {
    const [profiles, setProfiles] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        fetch('/securiteyes/risk/high', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        })
            .then(res => res.json())
            .then(data => {
            setProfiles(data || []);
            setLoading(false);
        })
            .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);
    if (loading)
        return <div>Loading Risk Profiles...</div>;
    return (<Card_1.Card>
            <Card_1.CardHeader>
                <Card_1.CardTitle>Insider Risk Profiles (High Risk)</Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent>
                {profiles.length === 0 ? (<div className="text-muted-foreground">No high risk profiles detected.</div>) : (<div className="space-y-4">
                        {profiles.map((profile) => (<div key={profile.principalId} className="p-4 border rounded bg-red-50 dark:bg-red-950/20">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-bold">Principal: {profile.principalId}</div>
                                    <Badge_1.Badge variant="destructive">Score: {profile.riskScore}</Badge_1.Badge>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    <div className="font-semibold mb-1">Recent Factors:</div>
                                    <ul className="list-disc pl-5">
                                        {Object.entries(profile.riskFactors).slice(-3).map(([ts, reason]) => (<li key={ts}>
                                                <span className="text-xs opacity-70">{new Date(ts).toLocaleString()}:</span> {reason}
                                            </li>))}
                                    </ul>
                                </div>
                             </div>))}
                    </div>)}
            </Card_1.CardContent>
        </Card_1.Card>);
};
exports.RiskProfileView = RiskProfileView;
