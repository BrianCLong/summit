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
exports.AdjudicationQueue = void 0;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const scroll_area_1 = require("@/components/ui/scroll-area");
const lucide_react_1 = require("lucide-react");
const ExplainPanel_1 = require("@/features/er/ExplainPanel");
const AdjudicationQueue = () => {
    const [candidates, setCandidates] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [selectedGroup, setSelectedGroup] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchCandidates();
    }, []);
    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/er/candidates');
            if (res.ok) {
                const data = await res.json();
                // Transform the map/array response to local state
                // Assuming API returns array of groups
                setCandidates(data);
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setLoading(false);
        }
    };
    const handleMerge = async (masterId, mergeIds) => {
        try {
            const res = await fetch('/er/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masterId, mergeIds, rationale: 'Manual adjudication' })
            });
            if (res.ok) {
                // Remove from list
                setCandidates(prev => prev.filter(c => c !== selectedGroup));
                setSelectedGroup(null);
            }
            else {
                alert('Merge failed - check policy?');
            }
        }
        catch (e) {
            console.error(e);
        }
    };
    return (<div className="grid grid-cols-12 gap-4 h-full p-4">
      <div className="col-span-4 border-r pr-4">
        <h2 className="text-xl font-bold mb-4">Adjudication Queue</h2>
        <scroll_area_1.ScrollArea className="h-[80vh]">
          {loading && <div>Loading candidates...</div>}
          {candidates.map((group, idx) => (<Card_1.Card key={idx} className={`mb-2 cursor-pointer ${selectedGroup === group ? 'border-primary' : ''}`} onClick={() => setSelectedGroup(group)}>
              <Card_1.CardContent className="p-4">
                <div className="font-semibold">Key: {group.canonicalKey}</div>
                <div className="text-sm text-gray-500">{group.entities.length} candidates</div>
              </Card_1.CardContent>
            </Card_1.Card>))}
        </scroll_area_1.ScrollArea>
      </div>

      <div className="col-span-8 pl-4">
        {selectedGroup ? (<EntityDiffPane group={selectedGroup} onMerge={handleMerge}/>) : (<div className="flex items-center justify-center h-full text-gray-400">
            Select a candidate group to adjudicate
          </div>)}
      </div>
    </div>);
};
exports.AdjudicationQueue = AdjudicationQueue;
const EntityDiffPane = ({ group, onMerge }) => {
    const [masterId, setMasterId] = (0, react_1.useState)(group.entities[0]?.id);
    const [explanation, setExplanation] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        // Fetch explanation for the group relative to master
        if (group.entities.length > 1) {
            const normalizeEntity = (entity) => ({
                id: entity.id,
                type: entity.type || 'entity',
                name: entity.properties?.name || entity.name || 'Unknown',
                tenantId: entity.tenantId || 'unknown',
                attributes: entity.properties || entity.attributes || {},
                aliases: entity.aliases,
                locations: entity.locations,
                timestamps: entity.timestamps,
                deviceIds: entity.deviceIds,
                accountIds: entity.accountIds,
                ipAddresses: entity.ipAddresses,
            });
            fetch('/er/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityA: normalizeEntity(group.entities[0]),
                    entityB: normalizeEntity(group.entities[1]),
                }),
            })
                .then(res => res.json())
                .then(data => setExplanation(data))
                .catch(console.error);
        }
    }, [group, masterId]);
    return (<div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Merge Candidates</h3>
        <Button_1.Button variant="default" onClick={() => onMerge(masterId, group.entities.map(e => e.id).filter(id => id !== masterId))}>
          <lucide_react_1.Split className="mr-2 h-4 w-4"/> Merge into Master
        </Button_1.Button>
      </div>

      {explanation && <ExplainPanel_1.ExplainPanel details={explanation}/>}

      <div className="grid grid-cols-2 gap-4">
         {group.entities.map(entity => (<Card_1.Card key={entity.id} className={`cursor-pointer ${masterId === entity.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setMasterId(entity.id)}>
             <Card_1.CardHeader className="pb-2">
               <Card_1.CardTitle className="text-lg flex justify-between">
                 {entity.properties.name || 'Unnamed'}
                 {masterId === entity.id && <Badge_1.Badge>Master</Badge_1.Badge>}
               </Card_1.CardTitle>
             </Card_1.CardHeader>
             <Card_1.CardContent className="text-sm space-y-1">
               <div>ID: {entity.id}</div>
               <div>Email: {entity.properties.email}</div>
               <div>Geo: {entity.properties.lat}, {entity.properties.lon}</div>
               {entity.lacLabels && (<div className="text-red-500 text-xs">LAC: {entity.lacLabels.join(', ')}</div>)}
             </Card_1.CardContent>
           </Card_1.Card>))}
      </div>
    </div>);
};
