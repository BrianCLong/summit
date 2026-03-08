"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingApprovals = getPendingApprovals;
exports.approveRequest = approveRequest;
exports.rejectRequest = rejectRequest;
const API_BASE = '/api/approvals';
async function getPendingApprovals() {
    const response = await fetch(`${API_BASE}?status=pending`);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch approvals: ${errorText}`);
    }
    return response.json();
}
async function approveRequest(id, reason) {
    const response = await fetch(`${API_BASE}/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to approve request: ${errorText}`);
    }
    return response.json();
}
async function rejectRequest(id, reason) {
    const response = await fetch(`${API_BASE}/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to reject request: ${errorText}`);
    }
    return response.json();
}
