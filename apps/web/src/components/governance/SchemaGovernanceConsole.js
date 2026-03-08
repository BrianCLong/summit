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
exports.SchemaGovernanceConsole = SchemaGovernanceConsole;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Tabs_1 = require("@/components/ui/Tabs");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
function SchemaGovernanceConsole() {
    const [activeTab, setActiveTab] = (0, react_1.useState)('schemas');
    const [schemas, setSchemas] = (0, react_1.useState)([]);
    const [changes, setChanges] = (0, react_1.useState)([]);
    const [vocabularies, setVocabularies] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [activeTab]);
    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'schemas') {
                const res = await fetch('/api/governance/schemas');
                if (res.ok)
                    setSchemas(await res.json());
            }
            else if (activeTab === 'changes') {
                const res = await fetch('/api/governance/changes');
                if (res.ok)
                    setChanges(await res.json());
            }
            else if (activeTab === 'vocabularies') {
                const res = await fetch('/api/governance/vocabularies');
                if (res.ok)
                    setVocabularies(await res.json());
            }
        }
        catch (e) {
            console.error("Failed to fetch governance data", e);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Ontology & Schema Governance</h1>
        <Button_1.Button onClick={() => fetchData()}>Refresh</Button_1.Button>
      </div>

      <Tabs_1.Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs_1.TabsList>
          <Tabs_1.TabsTrigger value="schemas">Schemas</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="vocabularies">Vocabularies</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="changes">Change Requests</Tabs_1.TabsTrigger>
        </Tabs_1.TabsList>

        <Tabs_1.TabsContent value="schemas" className="mt-6">
            <div className="grid gap-4">
                {schemas.map(schema => (<Card_1.Card key={schema.id}>
                        <Card_1.CardHeader>
                            <div className="flex justify-between">
                                <Card_1.CardTitle>Version {schema.version}</Card_1.CardTitle>
                                <Badge_1.Badge variant={schema.status === 'ACTIVE' ? 'default' : 'secondary'}>{schema.status}</Badge_1.Badge>
                            </div>
                        </Card_1.CardHeader>
                        <Card_1.CardContent>
                            <p className="text-sm text-gray-500">Created: {new Date(schema.createdAt).toLocaleDateString()}</p>
                            <div className="mt-4">
                                <h4 className="font-semibold mb-2">Entities ({schema.definition.entities.length})</h4>
                                <div className="flex flex-wrap gap-2">
                                    {schema.definition.entities.map((e) => (<Badge_1.Badge key={e.name} variant="outline">{e.name}</Badge_1.Badge>))}
                                </div>
                            </div>
                        </Card_1.CardContent>
                    </Card_1.Card>))}
            </div>
        </Tabs_1.TabsContent>

        <Tabs_1.TabsContent value="vocabularies">
            <div className="grid gap-4">
                 {vocabularies.length === 0 && <p>No vocabularies found.</p>}
                 {vocabularies.map(vocab => (<Card_1.Card key={vocab.id}>
                        <Card_1.CardHeader>
                             <Card_1.CardTitle>{vocab.name}</Card_1.CardTitle>
                        </Card_1.CardHeader>
                        <Card_1.CardContent>
                             <p className="text-sm text-gray-500">{vocab.description}</p>
                             <div className="mt-4">
                                 <h4 className="font-semibold mb-2">Concepts ({vocab.concepts.length})</h4>
                                 <div className="flex flex-wrap gap-2">
                                     {vocab.concepts.map((c) => (<Badge_1.Badge key={c.id} variant="outline">{c.term}</Badge_1.Badge>))}
                                 </div>
                             </div>
                        </Card_1.CardContent>
                    </Card_1.Card>))}
            </div>
        </Tabs_1.TabsContent>

        <Tabs_1.TabsContent value="changes">
             <div className="grid gap-4">
                {changes.length === 0 && <p>No change requests found.</p>}
                {changes.map(cr => (<Card_1.Card key={cr.id}>
                        <Card_1.CardHeader>
                            <div className="flex justify-between">
                                <Card_1.CardTitle>{cr.title}</Card_1.CardTitle>
                                <Badge_1.Badge>{cr.status}</Badge_1.Badge>
                            </div>
                        </Card_1.CardHeader>
                        <Card_1.CardContent>
                            <p className="text-sm">Author: {cr.author}</p>
                            <div className="mt-4 flex gap-2">
                                <Button_1.Button variant="outline" size="sm">View Impact</Button_1.Button>
                                <Button_1.Button size="sm">Review</Button_1.Button>
                            </div>
                        </Card_1.CardContent>
                    </Card_1.Card>))}
            </div>
        </Tabs_1.TabsContent>
      </Tabs_1.Tabs>
    </div>);
}
