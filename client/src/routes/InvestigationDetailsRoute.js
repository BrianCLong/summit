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
exports.default = InvestigationDetailsRoute;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const client_1 = require("@apollo/client");
const ProvenanceFilterPanel_1 = __importDefault(require("../components/ProvenanceFilterPanel"));
const ExportAuditBundleButton_1 = __importDefault(require("../components/ExportAuditBundleButton"));
const PROV_Q = (0, client_1.gql) `
  query ProvByInvestigation(
    $id: ID!
    $filter: ProvenanceFilter
    $first: Int
    $offset: Int
  ) {
    provenanceByInvestigation(
      investigationId: $id
      filter: $filter
      first: $first
      offset: $offset
    ) {
      id
      kind
      createdAt
      metadata
    }
  }
`;
function InvestigationDetailsRoute() {
    const { investigationId = '' } = (0, react_router_dom_1.useParams)();
    const [filter, setFilter] = (0, react_1.useState)(undefined);
    const [groupBy, setGroupBy] = (0, react_1.useState)('none');
    const variables = (0, react_1.useMemo)(() => ({ id: investigationId, filter, first: 50, offset: 0 }), [investigationId, filter]);
    const { data, loading, error, refetch } = (0, client_1.useQuery)(PROV_Q, {
        variables,
        fetchPolicy: 'cache-and-network',
        skip: !investigationId,
    });
    const events = data?.provenanceByInvestigation ?? [];
    const groups = (0, react_1.useMemo)(() => {
        if (!events || groupBy === 'none')
            return null;
        const fmt = (iso) => {
            const d = new Date(iso);
            if (groupBy === 'hour')
                return d.toISOString().slice(0, 13); // YYYY-MM-DDTHH
            // minute
            return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
        };
        const m = new Map();
        for (const e of events) {
            const k = fmt(e.createdAt || e.created_at);
            if (!m.has(k))
                m.set(k, []);
            m.get(k).push(e);
        }
        return Array.from(m.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
    }, [events, groupBy]);
    return (<div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          Investigation {investigationId}
        </h2>
        {!!investigationId && (<ExportAuditBundleButton_1.default investigationId={investigationId}/>)}
      </div>
      <ProvenanceFilterPanel_1.default onApply={(f) => {
            setFilter(f);
            refetch({ ...variables, filter: f });
        }} initial={filter} scope="investigation" id={investigationId}/>
      <div className="flex items-center gap-2 text-sm">
        <label className="opacity-70">Group by:</label>
        <select className="border p-1" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
          <option value="none">None</option>
          <option value="minute">Minute</option>
          <option value="hour">Hour</option>
        </select>
      </div>
      {loading && <div>Loading provenance…</div>}
      {error && <div className="text-red-600">Error loading provenance</div>}
      {!loading && !error && (<div>
          <div className="text-sm opacity-70 mb-2">
            {events.length} event(s)
          </div>
          {groupBy === 'none' ? (<table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Time</th>
                  <th className="p-2">Kind</th>
                  <th className="p-2">ReasonCode</th>
                  <th className="p-2">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (<tr key={e.id} className="border-b">
                    <td className="p-2">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2">{e.kind}</td>
                    <td className="p-2">{e.metadata?.reasonCode || '-'}</td>
                    <td className="p-2">
                      <MetadataPreview metadata={e.metadata}/>
                    </td>
                  </tr>))}
              </tbody>
            </table>) : (<div className="space-y-4">
              {groups.map(([bucket, items]) => (<div key={bucket} className="border rounded">
                  <div className="px-3 py-2 text-xs bg-gray-50 border-b">
                    {bucket.replace('T', ' ')} ({items.length})
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="p-2">Time</th>
                        <th className="p-2">Kind</th>
                        <th className="p-2">ReasonCode</th>
                        <th className="p-2">Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((e) => (<tr key={e.id} className="border-b">
                          <td className="p-2">
                            {new Date(e.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="p-2">{e.kind}</td>
                          <td className="p-2">
                            {e.metadata?.reasonCode || '-'}
                          </td>
                          <td className="p-2">
                            <MetadataPreview metadata={e.metadata}/>
                          </td>
                        </tr>))}
                    </tbody>
                  </table>
                </div>))}
            </div>)}
        </div>)}
    </div>);
}
function MetadataPreview({ metadata }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    if (!metadata)
        return <span className="opacity-50">-</span>;
    const preview = (() => {
        try {
            const s = JSON.stringify(metadata);
            return s.length > 60 ? s.slice(0, 60) + '…' : s;
        }
        catch {
            return String(metadata);
        }
    })();
    return (<span className="relative inline-block">
      <button className="text-blue-600 underline" onClick={() => setOpen((v) => !v)} title="Preview metadata">
        View
      </button>
      {open && (<div className="absolute z-10 mt-1 w-[320px] max-h-[240px] overflow-auto border rounded bg-white shadow p-2 text-xs">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>)}
    </span>);
}
