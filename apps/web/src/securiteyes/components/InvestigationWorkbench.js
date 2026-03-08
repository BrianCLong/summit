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
exports.InvestigationWorkbench = void 0;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Table_1 = require("@/components/ui/Table");
const Badge_1 = require("@/components/ui/Badge");
const InvestigationWorkbench = () => {
    const [incidents, setIncidents] = (0, react_1.useState)([]);
    const [selectedIncident, setSelectedIncident] = (0, react_1.useState)(null);
    const [evidence, setEvidence] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetch('/securiteyes/incidents', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
            .then(res => res.json())
            .then(data => setIncidents(data));
    }, []);
    const loadEvidence = async (incidentId) => {
        setLoading(true);
        setSelectedIncident(incidentId);
        try {
            const res = await fetch(`/securiteyes/incidents/${incidentId}/evidence`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            const data = await res.json();
            setEvidence(data.evidence || []);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            <Card_1.Card className="col-span-1">
                <Card_1.CardHeader>
                    <Card_1.CardTitle>Select Incident</Card_1.CardTitle>
                </Card_1.CardHeader>
                <Card_1.CardContent className="overflow-auto h-[500px]">
                    <Table_1.Table>
                        <Table_1.TableBody>
                            {incidents.map(inc => (<Table_1.TableRow key={inc.id} className="cursor-pointer hover:bg-muted" onClick={() => loadEvidence(inc.id)}>
                                    <Table_1.TableCell>
                                        <div className="font-medium">{inc.title}</div>
                                        <div className="text-xs text-muted-foreground">{new Date(inc.createdAt).toLocaleDateString()}</div>
                                    </Table_1.TableCell>
                                </Table_1.TableRow>))}
                        </Table_1.TableBody>
                    </Table_1.Table>
                </Card_1.CardContent>
            </Card_1.Card>

            <Card_1.Card className="col-span-2">
                <Card_1.CardHeader>
                    <Card_1.CardTitle>Evidence Graph & Timeline {loading && '(Loading...)'}</Card_1.CardTitle>
                </Card_1.CardHeader>
                <Card_1.CardContent className="h-[500px] overflow-auto">
                    {!selectedIncident ? (<div className="flex items-center justify-center h-full text-muted-foreground">
                            Select an incident to view evidence.
                        </div>) : (<div className="space-y-6">
                            {/* Simple Graph Representation List since we lack a graph library setup */}
                            <div>
                                <h3 className="font-semibold mb-2">Linked Entities</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {evidence.map(e => (<div key={e.id} className="p-2 border rounded text-sm">
                                            <Badge_1.Badge variant="outline" className="mb-1">{e.labels?.[0] || 'Unknown'}</Badge_1.Badge>
                                            <div className="truncate" title={JSON.stringify(e.properties)}>
                                                {e.properties.name || e.properties.value || e.properties.eventType || e.id}
                                            </div>
                                        </div>))}
                                </div>
                            </div>
                        </div>)}
                </Card_1.CardContent>
            </Card_1.Card>
        </div>);
};
exports.InvestigationWorkbench = InvestigationWorkbench;
