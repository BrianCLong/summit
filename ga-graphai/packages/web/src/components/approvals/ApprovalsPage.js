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
exports.ApprovalsPage = void 0;
const react_1 = __importStar(require("react"));
const approvals_js_1 = require("../../api/approvals.js");
const ApprovalsTable_js_1 = require("./ApprovalsTable.js");
const ApprovalDetailDrawer_js_1 = require("./ApprovalDetailDrawer.js");
const ApprovalFilters_js_1 = require("./ApprovalFilters.js");
const ApprovalsPage = () => {
    const [filters, setFilters] = (0, react_1.useState)({
        status: "PENDING",
        tenantId: "",
        operation: "grant_elevated_access",
        riskTier: "",
    });
    const [approvals, setApprovals] = (0, react_1.useState)([]);
    const [total, setTotal] = (0, react_1.useState)(0);
    const [page, setPage] = (0, react_1.useState)(0);
    const [pageSize] = (0, react_1.useState)(20);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [selectedApprovalId, setSelectedApprovalId] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const run = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await (0, approvals_js_1.fetchApprovals)({
                    status: filters.status === "ALL" ? undefined : filters.status,
                    tenantId: filters.tenantId || undefined,
                    operation: filters.operation || undefined,
                    riskTier: filters.riskTier || undefined,
                    page,
                    pageSize,
                });
                setApprovals(res.items);
                setTotal(res.total);
            }
            catch (e) {
                setError(e.message ?? "Failed to load approvals");
            }
            finally {
                setLoading(false);
            }
        };
        run();
    }, [filters, page, pageSize]);
    return (<div className="flex flex-col h-full">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Approvals</h1>
          <p className="text-sm text-gray-500">Review and decide on elevated access requests.</p>
        </div>
      </header>

      <ApprovalFilters_js_1.ApprovalFilters value={filters} onChange={setFilters}/>

      <div className="flex-1 mt-4">
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
        {error && <div className="text-sm text-red-600 mb-2">Error: {error}</div>}
        {!loading && approvals.length === 0 && !error && (<div className="text-sm text-gray-500">No approvals match your filters.</div>)}

        {approvals.length > 0 && (<ApprovalsTable_js_1.ApprovalsTable approvals={approvals} total={total} page={page} pageSize={pageSize} onPageChange={setPage} onSelect={(id) => setSelectedApprovalId(id)}/>)}
      </div>

      <ApprovalDetailDrawer_js_1.ApprovalDetailDrawer approvalId={selectedApprovalId} onClose={() => setSelectedApprovalId(null)} onDecision={() => {
            setPage(0);
        }}/>
    </div>);
};
exports.ApprovalsPage = ApprovalsPage;
