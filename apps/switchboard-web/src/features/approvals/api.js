"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchApprovals = fetchApprovals;
exports.approveApproval = approveApproval;
exports.rejectApproval = rejectApproval;
const API_BASE = '/api/approvals';
async function parseError(response) {
    let body;
    try {
        body = await response.json();
    }
    catch (error) {
        body = undefined;
    }
    const error = new Error(body?.error ?? body?.message ?? `Request failed with status ${response.status}`);
    error.status = response.status;
    return error;
}
async function request(path, init) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });
    if (!response.ok) {
        throw await parseError(response);
    }
    return (await response.json());
}
function fetchApprovals(status) {
    const query = status ? `?status=${status}` : '';
    return request(`/${query}`);
}
function approveApproval(id, reason) {
    return request(`/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}
function rejectApproval(id, reason) {
    return request(`/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}
