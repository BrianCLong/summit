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
exports.default = Watchlists;
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const material_1 = require("@mui/material");
const WL_Q = (0, client_1.gql) `
  query {
    myWatchlists {
      id
      name
      rules
    }
  }
`;
const ALERTS_Q = (0, client_1.gql) `
  query ($watchlistId: ID, $status: String, $limit: Int) {
    alerts(watchlistId: $watchlistId, status: $status, limit: $limit) {
      id
      status
      docHash
      createdAt
    }
  }
`;
const CASES_Q = (0, client_1.gql) `
  query {
    cases {
      id
      name
    }
  }
`;
const ADD_ITEM_M = (0, client_1.gql) `
  mutation ($caseId: ID!, $kind: String!, $refId: ID!) {
    addCaseItem(caseId: $caseId, kind: $kind, refId: $refId) {
      id
    }
  }
`;
function Watchlists() {
    const { data } = (0, client_1.useQuery)(WL_Q);
    const [selected, setSelected] = react_1.default.useState(null);
    const { data: alerts, refetch } = (0, client_1.useQuery)(ALERTS_Q, {
        variables: { watchlistId: selected, limit: 50 },
        skip: !selected,
    });
    const { data: cases } = (0, client_1.useQuery)(CASES_Q);
    const [addItem] = (0, client_1.useMutation)(ADD_ITEM_M);
    const [caseOpen, setCaseOpen] = (0, react_1.useState)(false);
    const [caseId, setCaseId] = (0, react_1.useState)('');
    const [pendingAlert, setPendingAlert] = (0, react_1.useState)(null);
    return (<div className="p-4">
      <h2>Watchlists</h2>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 320 }}>
          <ul>
            {(data?.myWatchlists || []).map((w) => (<li key={w.id}>
                <button onClick={() => setSelected(w.id)}>{w.name}</button>
              </li>))}
          </ul>
        </div>
        <div style={{ flex: 1 }}>
          <h3>Alerts</h3>
          <ul>
            {(alerts?.alerts || []).map((a) => (<li key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>
                  {a.status} • {a.docHash} • {a.createdAt}
                </span>
                <material_1.Button size="small" variant="outlined" onClick={() => {
                setPendingAlert(a);
                setCaseOpen(true);
            }}>
                  Add to Case
                </material_1.Button>
              </li>))}
          </ul>
        </div>
      </div>
      <material_1.Dialog open={caseOpen} onClose={() => setCaseOpen(false)}>
        <material_1.DialogTitle>Add alert to case</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.Select fullWidth size="small" value={caseId} onChange={(e) => setCaseId(String(e.target.value))}>
            {(cases?.cases || []).map((c) => (<material_1.MenuItem value={c.id} key={c.id}>
                {c.name}
              </material_1.MenuItem>))}
          </material_1.Select>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={() => setCaseOpen(false)}>Cancel</material_1.Button>
          <material_1.Button variant="contained" onClick={async () => {
            if (!caseId || !pendingAlert)
                return;
            await addItem({
                variables: { caseId, kind: 'ALERT', refId: pendingAlert.id },
            });
            setCaseOpen(false);
            setCaseId('');
            setPendingAlert(null);
        }}>
            Add
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </div>);
}
