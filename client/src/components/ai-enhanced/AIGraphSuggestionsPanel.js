"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AIGraphSuggestionsPanel;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
async function gql(query, variables) {
    const res = await fetch('/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('ig_jwt')}`,
        },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors)
        throw new Error(json.errors[0].message);
    return json.data;
}
function AIGraphSuggestionsPanel() {
    const [items, setItems] = react_1.default.useState([]);
    const [loading, setLoading] = react_1.default.useState(false);
    const load = react_1.default.useCallback(async () => {
        setLoading(true);
        const data = await gql(`query { suggestions { id type label confidence status createdAt } }`);
        setItems(data.suggestions);
        setLoading(false);
    }, []);
    react_1.default.useEffect(() => {
        load();
    }, [load]);
    const act = async (id, kind) => {
        await gql(`mutation($id: ID!) { ${kind}Suggestion(id:$id) }`, { id });
        await load();
    };
    return (<div aria-label="AI Suggestions" role="region" className="space-y-3">
      {loading && <div role="status">Loading…</div>}
      {items.map((s) => (<material_1.Card key={s.id} className="rounded-2xl shadow p-2">
          <material_1.CardContent>
            <div className="text-sm opacity-70">
              {s.type} • {s.createdAt}
            </div>
            <div className="text-lg font-medium">{s.label}</div>
            <div className="text-sm">
              confidence: {Math.round(s.confidence * 100)}%
            </div>
            <div className="mt-2 flex gap-2">
              <material_1.Button size="small" variant="contained" onClick={() => act(s.id, 'accept')}>
                Accept
              </material_1.Button>
              <material_1.Button size="small" variant="outlined" onClick={() => act(s.id, 'reject')}>
                Reject
              </material_1.Button>
            </div>
          </material_1.CardContent>
        </material_1.Card>))}
      {!loading && items.length === 0 && <div>No pending suggestions</div>}
    </div>);
}
