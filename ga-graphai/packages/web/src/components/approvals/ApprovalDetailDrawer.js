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
exports.ApprovalDetailDrawer = void 0;
const react_1 = __importStar(require("react"));
const approvals_js_1 = require("../../api/approvals.js");
const ApprovalDetailDrawer = ({ approvalId, onClose, onDecision }) => {
    const [approval, setApproval] = (0, react_1.useState)(null);
    const [simResult, setSimResult] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [simLoading, setSimLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [decision, setDecision] = (0, react_1.useState)(null);
    const [rationale, setRationale] = (0, react_1.useState)("");
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (!approvalId)
            return;
        const run = async () => {
            try {
                setLoading(true);
                setError(null);
                const a = await (0, approvals_js_1.fetchApproval)(approvalId);
                setApproval(a);
                setDecision(null);
                setRationale("");
            }
            catch (e) {
                setError(e.message ?? "Failed to load approval");
            }
            finally {
                setLoading(false);
            }
        };
        run();
    }, [approvalId]);
    (0, react_1.useEffect)(() => {
        if (!approval)
            return;
        const run = async () => {
            try {
                setSimLoading(true);
                const res = await (0, approvals_js_1.simulatePolicy)(approval.operation, approval.attributes);
                setSimResult(res);
            }
            catch {
                setSimResult(null);
            }
            finally {
                setSimLoading(false);
            }
        };
        run();
    }, [approval]);
    if (!approvalId)
        return null;
    const disabled = !decision || !rationale.trim() || submitting || approval?.status !== "PENDING";
    const handleSubmit = async () => {
        if (!approval || !decision)
            return;
        setSubmitting(true);
        try {
            await (0, approvals_js_1.decideApproval)(approval.id, decision, rationale.trim());
            onDecision();
            onClose();
        }
        catch (e) {
            setError(e.message ?? "Failed to submit decision");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<div className="fixed inset-0 flex justify-end z-40">
      <div className="flex-1 bg-black/40" onClick={onClose}/>
      <div className="w-full max-w-md bg-white shadow-xl h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-sm font-semibold">Approval: {approval?.id ?? approvalId}</h2>
            {approval && (<p className="text-xs text-gray-500">
                {approval.operation} • {approval.target.userId} @ {approval.target.tenantId}
              </p>)}
          </div>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-800">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
          {loading && <div>Loading approval…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {approval && (<>
              <section>
                <h3 className="font-medium mb-1">Request</h3>
                <div className="text-xs text-gray-600 space-y-0.5">
                  <div>Requester: {approval.requesterId}</div>
                  <div>Target user: {approval.target.userId}</div>
                  <div>Tenant: {approval.target.tenantId}</div>
                  {approval.target.role && <div>Role requested: {approval.target.role}</div>}
                  <div>Created: {new Date(approval.createdAt).toLocaleString()}</div>
                  {approval.status !== "PENDING" && (<>
                      <div>Status: {approval.status}</div>
                      {approval.approverId && <div>Approver: {approval.approverId}</div>}
                      {approval.decidedAt && <div>Decided: {new Date(approval.decidedAt).toLocaleString()}</div>}
                    </>)}
                </div>
              </section>

              <section>
                <h3 className="font-medium mb-1">Attributes</h3>
                <pre className="bg-gray-50 border rounded p-2 text-xs overflow-x-auto">
                  {JSON.stringify(approval.attributes, null, 2)}
                </pre>
              </section>

              <section>
                <h3 className="font-medium mb-1">Policy Simulation</h3>
                {simLoading && <div className="text-xs text-gray-500">Running simulation…</div>}
                {!simLoading && simResult && (<div className="text-xs text-gray-700 space-y-1">
                    <div>
                      Allow: <span className="font-mono">{simResult.allow ? "true" : "false"}</span>
                    </div>
                    <div>
                      Requires approval: <span className="font-mono">{simResult.requiresApproval ? "true" : "false"}</span>
                    </div>
                    {simResult.reasons?.length > 0 && (<ul className="list-disc list-inside">
                        {simResult.reasons.map((r, i) => (<li key={i}>{r}</li>))}
                      </ul>)}
                  </div>)}
                {!simLoading && !simResult && <div className="text-xs text-gray-500">Simulation unavailable.</div>}
              </section>

              <section>
                <h3 className="font-medium mb-1">Decision</h3>
                {approval.status !== "PENDING" ? (<div className="text-xs text-gray-600">
                    Already decided ({approval.status}). You cannot change this decision here.
                  </div>) : (<>
                    <div className="flex gap-3 mb-2 text-xs">
                      <label className="flex items-center gap-1">
                        <input type="radio" name="decision" value="APPROVED" checked={decision === "APPROVED"} onChange={() => setDecision("APPROVED")}/>
                        Approve
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" name="decision" value="REJECTED" checked={decision === "REJECTED"} onChange={() => setDecision("REJECTED")}/>
                        Reject
                      </label>
                    </div>
                    <label className="flex flex-col gap-1 text-xs">
                      Rationale (required)
                      <textarea className="border rounded p-2 text-xs min-h-[80px]" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Include ticket #, justification, time-bounds…"/>
                    </label>
                  </>)}
              </section>
            </>)}
        </div>

        {approval && approval.status === "PENDING" && (<div className="border-t px-4 py-3 flex items-center justify-between">
            <div className="text-[11px] text-gray-500">You must provide rationale for elevated access.</div>
            <button disabled={disabled} onClick={handleSubmit} className="px-3 py-1.5 text-xs rounded bg-black text-white disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit decision"}
            </button>
          </div>)}
      </div>
    </div>);
};
exports.ApprovalDetailDrawer = ApprovalDetailDrawer;
