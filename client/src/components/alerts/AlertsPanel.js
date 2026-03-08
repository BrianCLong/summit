"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsPanel = void 0;
const react_1 = __importDefault(require("react"));
const client_1 = require("@apollo/client");
const SUB = (0, client_1.gql) `
  subscription AlertStream($caseId: ID!) {
    alertStream(caseId: $caseId) {
      id
      caseId
      nodeIds
      severity
      kind
      reason
      ts
    }
  }
`;
const AlertsPanel = ({ caseId }) => {
    const { data } = (0, client_1.useSubscription)(SUB, { variables: { caseId } });
    const a = data?.alertStream;
    return (<div className="p-3 border rounded-xl">
      <div className="font-semibold mb-2">Live Alerts</div>
      {a ? (<div className="p-2 mb-2 rounded-md border alert-item" data-nodes={a.nodeIds.join(',')}>
          <div className="text-sm">
            {a.kind} • {a.severity}
          </div>
          <div className="text-xs opacity-70">{a.reason}</div>
        </div>) : (<div className="text-xs opacity-60">Listening…</div>)}
    </div>);
};
exports.AlertsPanel = AlertsPanel;
