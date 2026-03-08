"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchApprovals = fetchApprovals;
exports.fetchApproval = fetchApproval;
exports.decideApproval = decideApproval;
exports.simulatePolicy = simulatePolicy;
exports.fetchReceipt = fetchReceipt;
async function fetchApprovals(filters) {
    const params = new URLSearchParams();
    if (filters.status)
        params.set("status", filters.status);
    if (filters.tenantId)
        params.set("tenantId", filters.tenantId);
    if (filters.operation)
        params.set("operation", filters.operation);
    if (filters.riskTier)
        params.set("riskTier", filters.riskTier);
    if (filters.page != null)
        params.set("page", String(filters.page));
    if (filters.pageSize != null)
        params.set("pageSize", String(filters.pageSize));
    const res = await fetch(`/api/approvals?${params.toString()}`);
    if (!res.ok)
        throw new Error("Failed to load approvals");
    return res.json();
}
async function fetchApproval(id) {
    const res = await fetch(`/api/approvals/${id}`);
    if (!res.ok)
        throw new Error("Failed to load approval");
    return res.json();
}
async function decideApproval(id, decision, rationale) {
    const res = await fetch(`/api/approvals/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rationale }),
    });
    if (!res.ok)
        throw new Error("Failed to submit decision");
    return res.json();
}
async function simulatePolicy(operation, attributes) {
    const res = await fetch(`/api/policy/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, attributes }),
    });
    if (!res.ok)
        throw new Error("Policy simulation failed");
    return res.json();
}
async function fetchReceipt(id) {
    const res = await fetch(`/api/receipts/${id}`);
    if (!res.ok)
        throw new Error("Failed to load receipt");
    return res.json();
}
