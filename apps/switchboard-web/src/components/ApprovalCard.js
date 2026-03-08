"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalCard = ApprovalCard;
const react_1 = __importDefault(require("react"));
function ApprovalCard({ approval, onApprove, onReject }) {
    return (<div style={{ border: '1px solid #ccc', padding: '16px', margin: '16px', borderRadius: '8px', background: '#fff' }}>
      <h3>Request from {approval.requester_id}</h3>
      <p><strong>Action:</strong> {approval.action}</p>
      <p><strong>Reason:</strong> {approval.reason}</p>
      <p><strong>Time:</strong> {new Date(approval.created_at).toLocaleString()}</p>
      {approval.payload && (<details>
          <summary>Payload</summary>
          <pre style={{ background: '#f5f5f5', padding: '8px', overflow: 'auto' }}>
            {JSON.stringify(approval.payload, null, 2)}
          </pre>
        </details>)}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={() => onApprove(approval.id)} style={{ background: '#4CAF50', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Approve
        </button>
        <button onClick={() => onReject(approval.id)} style={{ background: '#f44336', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Reject
        </button>
      </div>
    </div>);
}
