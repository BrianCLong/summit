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
exports.default = Cases;
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const material_1 = require("@mui/material");
const CASES_Q = (0, client_1.gql) `
  query ($status: String) {
    cases(status: $status) {
      id
      name
      status
      priority
      summary
      createdAt
    }
  }
`;
const CREATE_M = (0, client_1.gql) `
  mutation ($input: CaseInput!) {
    createCase(input: $input) {
      id
      name
      status
    }
  }
`;
function Cases() {
    const { data, refetch } = (0, client_1.useQuery)(CASES_Q);
    const [createCase] = (0, client_1.useMutation)(CREATE_M);
    const [name, setName] = (0, react_1.useState)('');
    const [priority, setPriority] = (0, react_1.useState)('');
    const [summary, setSummary] = (0, react_1.useState)('');
    const onCreate = async () => {
        if (!name)
            return;
        await createCase({ variables: { input: { name, priority, summary } } });
        setName('');
        setPriority('');
        setSummary('');
        refetch();
    };
    return (<div className="p-4">
      <h2>Cases</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <material_1.TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)}/>
        <material_1.TextField size="small" label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}/>
        <material_1.TextField size="small" label="Summary" value={summary} onChange={(e) => setSummary(e.target.value)}/>
        <material_1.Button variant="contained" onClick={onCreate}>
          Create
        </material_1.Button>
      </div>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-2">Name</th>
            <th className="border px-2">Status</th>
            <th className="border px-2">Priority</th>
            <th className="border px-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {(data?.cases || []).map((c) => (<tr key={c.id}>
              <td className="border px-2">{c.name}</td>
              <td className="border px-2">{c.status}</td>
              <td className="border px-2">{c.priority || ''}</td>
              <td className="border px-2">{c.createdAt}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
