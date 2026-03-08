"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CaseDetail;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const client_1 = require("@apollo/client");
const CASE_Q = (0, client_1.gql) `
  query ($id: ID!) {
    case(id: $id) {
      id
      name
      status
      priority
      summary
      createdAt
    }
    caseItems(caseId: $id) {
      id
      kind
      refId
      tags
      addedAt
    }
    caseTimeline(caseId: $id, limit: 100) {
      id
      at
      event
      payload
    }
  }
`;
function CaseDetail() {
    const { id } = (0, react_router_dom_1.useParams)();
    const { data } = (0, client_1.useQuery)(CASE_Q, { variables: { id } });
    const c = data?.case;
    return (<div className="p-4" style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <h2>{c?.name || 'Case'}</h2>
        <p>
          Status: {c?.status} • Priority: {c?.priority || '-'}
        </p>
        <h3>Timeline</h3>
        <ul>
          {(data?.caseTimeline || []).map((t) => (<li key={t.id}>
              {t.at} • {t.event} • {JSON.stringify(t.payload)}
            </li>))}
        </ul>
      </div>
      <div style={{ width: 420 }}>
        <h3>Evidence</h3>
        <ul>
          {(data?.caseItems || []).map((it) => (<li key={it.id}>
              {it.kind}: {it.refId}{' '}
              {it.tags?.length ? `[${it.tags.join(',')}]` : ''}
            </li>))}
        </ul>
      </div>
    </div>);
}
