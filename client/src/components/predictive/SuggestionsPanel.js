"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestionsPanel = void 0;
const react_1 = __importDefault(require("react"));
const client_1 = require("@apollo/client");
const react_hot_toast_1 = require("react-hot-toast");
const SUGGEST = (0, client_1.gql) `
  query SuggestLinks($input: SuggestLinksInput!) {
    suggestLinks(input: $input) {
      generatedAt
      suggestions {
        id
        sourceId
        targetId
        score
        reasons {
          label
          weight
        }
      }
    }
  }
`;
const ACCEPT = (0, client_1.gql) `
  mutation Accept($id: ID!) {
    acceptSuggestion(id: $id) {
      id
      status
    }
  }
`;
const REJECT = (0, client_1.gql) `
  mutation Reject($id: ID!, $reason: String) {
    rejectSuggestion(id: $id, reason: $reason) {
      id
      status
    }
  }
`;
const SuggestionsPanel = ({ caseId, seeds }) => {
    const { data, refetch, loading } = (0, client_1.useQuery)(SUGGEST, {
        variables: { input: { caseId, seedNodeIds: seeds, topK: 20 } },
    });
    const [accept] = (0, client_1.useMutation)(ACCEPT);
    const [reject] = (0, client_1.useMutation)(REJECT);
    const items = data?.suggestLinks?.suggestions || [];
    return (<div className="p-3 border rounded-xl">
      <div className="font-semibold mb-2">
        Predictive Links {loading ? '…' : ''}
      </div>
      <ul className="space-y-2">
        {items.map((s) => (<li key={s.id} className="p-2 rounded-md border flex items-center justify-between suggestion-item" data-source={s.sourceId} data-target={s.targetId}>
            <div>
              <div className="text-sm">
                {' '}
                {s.sourceId} → {s.targetId}{' '}
              </div>
              <div className="text-xs opacity-70">
                score: {s.score.toFixed(3)} •{' '}
                {s.reasons.map((r) => r.label).join(', ')}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-2 py-1 rounded bg-green-600 text-white" onClick={() => accept({ variables: { id: s.id } })
                .then(() => react_hot_toast_1.toast.success('Link accepted'))
                .then(() => refetch())}>
                Accept
              </button>
              <button className="px-2 py-1 rounded bg-neutral-700 text-white" onClick={() => reject({ variables: { id: s.id, reason: 'not relevant' } })
                .then(() => (0, react_hot_toast_1.toast)('Rejected'))
                .then(() => refetch())}>
                Reject
              </button>
            </div>
          </li>))}
      </ul>
    </div>);
};
exports.SuggestionsPanel = SuggestionsPanel;
