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
exports.TaskFeed = TaskFeed;
const react_1 = __importStar(require("react"));
const api_1 = require("../api");
const ApprovalCard_1 = require("./ApprovalCard");
function TaskFeed() {
    const [approvals, setApprovals] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchApprovals = async () => {
        try {
            const data = await (0, api_1.getPendingApprovals)();
            setApprovals(data);
            setError(null);
        }
        catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchApprovals();
        const interval = setInterval(fetchApprovals, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);
    const handleApprove = async (id) => {
        try {
            await (0, api_1.approveRequest)(id);
            fetchApprovals(); // Refresh immediately
        }
        catch (err) {
            alert(`Error approving: ${err.message}`);
        }
    };
    const handleReject = async (id) => {
        const reason = prompt('Reason for rejection:');
        if (reason === null)
            return;
        try {
            await (0, api_1.rejectRequest)(id, reason);
            fetchApprovals(); // Refresh immediately
        }
        catch (err) {
            alert(`Error rejecting: ${err.message}`);
        }
    };
    if (loading && approvals.length === 0)
        return <div>Loading approvals...</div>;
    if (error)
        return <div style={{ color: 'red', padding: '20px' }}>Error loading approvals: {error}</div>;
    return (<div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Pending Approvals ({approvals.length})</h2>
      {approvals.length === 0 ? (<p style={{ textAlign: 'center', color: '#666' }}>No pending approvals.</p>) : (approvals.map(app => (<ApprovalCard_1.ApprovalCard key={app.id} approval={app} onApprove={handleApprove} onReject={handleReject}/>)))}
    </div>);
}
