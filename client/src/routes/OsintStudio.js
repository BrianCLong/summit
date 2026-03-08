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
exports.default = OsintStudio;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const cytoscape_1 = __importDefault(require("cytoscape"));
const socket_1 = require("../services/socket");
const client_1 = require("@apollo/client");
const jquery_1 = __importDefault(require("jquery"));
const AddCaseModal_1 = __importDefault(require("../components/cases/AddCaseModal")); // New import
const OSINT_SEARCH = (0, client_1.gql) `
  query OsintSearch($search: String, $limit: Int) {
    osintItems(search: $search, limit: $limit) {
      hash
      title
      url
      publishedAt
    }
  }
`;
const CASES_Q = (0, client_1.gql) `
  query GetCases {
    cases {
      id
      name
    }
  }
`;
const ADD_ITEM_M = (0, client_1.gql) `
  mutation AddCaseItem(
    $caseId: ID!
    $kind: String!
    $refId: String!
    $tags: [String!]
  ) {
    addCaseItem(caseId: $caseId, kind: $kind, refId: $refId, tags: $tags) {
      id
    }
  }
`;
const CREATE_CASE_MUTATION = (0, client_1.gql) `
  mutation CreateCase($name: String!, $summary: String) {
    createCase(name: $name, summary: $summary) {
      id
      name
    }
  }
`;
function OsintStudio() {
    const cyRef = (0, react_1.useRef)(null);
    const containerRef = (0, react_1.useRef)(null);
    const [search, setSearch] = (0, react_1.useState)('');
    const [selected, setSelected] = (0, react_1.useState)(null);
    const [drawerOpen, setDrawerOpen] = (0, react_1.useState)(false);
    const [addCaseModalOpen, setAddCaseModalOpen] = (0, react_1.useState)(false); // New state for modal
    const { data: cases } = (0, client_1.useQuery)(CASES_Q); // This will now query the actual cases
    const [addItem] = (0, client_1.useMutation)(ADD_ITEM_M); // This will now use the actual addCaseItem mutation
    (0, react_1.useEffect)(() => {
        if (!containerRef.current)
            return;
        cyRef.current = (0, cytoscape_1.default)({
            container: containerRef.current,
            elements: [],
            layout: { name: 'cose' },
            style: [
                {
                    selector: 'node',
                    style: {
                        label: 'data(label)',
                        'background-color': '#1976d2',
                        color: '#fff',
                        'font-size': 10,
                    },
                },
            ],
        });
        const socket = (0, socket_1.getSocket)();
        if (socket) {
            socket.on('OSINT_EVT', (evt) => {
                // eslint-disable-next-line no-console
                console.log('OSINT_EVT', evt);
                const id = evt.itemId || `${Date.now()}`;
                cyRef.current.add({
                    data: { id, label: evt.message || evt.kind },
                    classes: 'doc',
                });
                cyRef.current.layout({ name: 'cose' }).run();
            });
        }
        cyRef.current.on('tap', 'node', (e) => {
            const d = e.target.data();
            setSelected(d);
            setDrawerOpen(true);
        });
        const onResize = () => cyRef.current?.resize();
        window.addEventListener('resize', onResize);
        const handleKeyDown = (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'A') {
                event.preventDefault();
                if (selected) {
                    // Only open if a node is selected
                    setAddCaseModalOpen(true);
                }
                else {
                    (0, jquery_1.default)(document).trigger('intelgraph:toast', [
                        'Please select an OSINT item first.',
                    ]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('keydown', handleKeyDown);
            socket?.off('OSINT_EVT');
        };
    }, [selected]); // Add selected to dependency array
    const [runSearch, { data }] = (0, client_1.useLazyQuery)(OSINT_SEARCH);
    function onSearch() {
        (0, jquery_1.default)(document).trigger('intelgraph:toast', [`Searching OSINT: ${search}`]);
        runSearch({ variables: { search, limit: 50 } });
    }
    (0, react_1.useEffect)(() => {
        if (!data?.osintItems)
            return;
        const nodes = data.osintItems.map((d) => ({
            data: {
                id: d.hash,
                label: d.title || d.url || d.hash,
                entities: d.entities,
                claims: d.claims,
                license: d.license,
            },
        }));
        cyRef.current.add(nodes);
        cyRef.current.layout({ name: 'cose' }).run();
    }, [data]);
    return (<>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <material_1.Tooltip title="Search canonicalized OSINT documents">
            <material_1.TextField size="small" label="Search OSINT" value={search} onChange={(e) => setSearch(e.target.value)}/>
          </material_1.Tooltip>
          <material_1.Button variant="contained" onClick={onSearch} title="Run OSINT search (GraphQL)">
            Search
          </material_1.Button>
        </div>
        <div ref={containerRef} style={{
            height: 600,
            borderRadius: 16,
            boxShadow: '0 0 12px rgba(0,0,0,0.08)',
        }}/>
      </div>
      <material_1.Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div style={{ width: 340, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>OSINT Item</h3>
          {selected?.license && selected.license.allowExport === false && (<div style={{
                background: '#fff3cd',
                color: '#664d03',
                padding: 8,
                borderRadius: 6,
                marginBottom: 8,
            }}>
              Export disabled by license
            </div>)}
          <div style={{ marginBottom: 8 }}>
            <strong>Entities</strong>
            <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 6,
        }}>
              {(selected?.entities || []).slice(0, 20).map((e) => (<material_1.Chip key={e.id} label={e.name || e.id} size="small"/>))}
            </div>
          </div>
          <div>
            <strong>Claims</strong>
            <material_1.List dense>
              {(selected?.claims || [])
            .slice(0, 20)
            .map((c, i) => (<material_1.ListItem key={i}>
                    <material_1.ListItemText primary={c.text} secondary={typeof c.confidence === 'number'
                ? `confidence ${c.confidence}`
                : undefined}/>
                  </material_1.ListItem>))}
            </material_1.List>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <material_1.Button variant="outlined" onClick={() => setDrawerOpen(false)}>
              Close
            </material_1.Button>
            <material_1.Button variant="contained" disabled={selected?.license && selected.license.allowExport === false} onClick={() => {
            if (!selected)
                return;
            (0, jquery_1.default)(document).trigger('intelgraph:toast', ['Preparing export…']);
            // Export single selected for MVP; multi-select can follow
            fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'mutation($ids:[ID!]!, $fmt:ExportFormat!){ exportOsintBundle(ids:$ids, format:$fmt){ url } }',
                    variables: { ids: [selected.id], fmt: 'JSON' },
                }),
            })
                .then((r) => r.json())
                .then((res) => {
                const url = res?.data?.exportOsintBundle?.url;
                if (url)
                    window.open(url, '_blank');
            });
        }}>
              Export
            </material_1.Button>
            <material_1.Button variant="outlined" onClick={() => setAddCaseModalOpen(true)}>
              Add to Case
            </material_1.Button>{' '}
            {/* Open modal */}
          </div>
        </div>
      </material_1.Drawer>
      {selected && (<AddCaseModal_1.default open={addCaseModalOpen} handleClose={() => setAddCaseModalOpen(false)} itemKind="OSINT_DOC" itemRefId={selected.id}/>)}
    </>);
}
