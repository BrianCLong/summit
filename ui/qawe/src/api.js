"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchServerInfo = fetchServerInfo;
exports.createWorkflow = createWorkflow;
exports.startInstance = startInstance;
exports.loadInstance = loadInstance;
exports.submitApproval = submitApproval;
async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    return (await res.json());
}
async function fetchServerInfo() {
    const res = await fetch('/api/info');
    return handleResponse(res);
}
async function createWorkflow(def) {
    const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(def),
    });
    return handleResponse(res);
}
async function startInstance(workflowId, context) {
    const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, context }),
    });
    return handleResponse(res);
}
async function loadInstance(instanceId) {
    const res = await fetch(`/api/instances/${instanceId}`);
    return handleResponse(res);
}
async function submitApproval(instanceId, approval) {
    const res = await fetch(`/api/instances/${instanceId}/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approval),
    });
    return handleResponse(res);
}
