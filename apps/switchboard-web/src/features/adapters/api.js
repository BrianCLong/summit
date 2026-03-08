"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAdapters = fetchAdapters;
exports.performAdapterAction = performAdapterAction;
const API_BASE = '/api/switchboard';
async function parseError(response) {
    let body;
    try {
        body = await response.json();
    }
    catch (error) {
        body = undefined;
    }
    const error = new Error(body?.message ?? `Request failed with status ${response.status}`);
    error.status = typeof body?.status === 'number'
        ? body.status
        : response.status;
    const policyErrors = body?.policyErrors ??
        body?.policy;
    const verificationErrors = body?.
        verificationErrors ?? body?.verification;
    if (policyErrors) {
        error.policyErrors = policyErrors;
    }
    if (verificationErrors) {
        error.verificationErrors = verificationErrors;
    }
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
    if (response.status === 204) {
        return {};
    }
    return (await response.json());
}
function fetchAdapters() {
    return request('/adapters');
}
function performAdapterAction(adapterId, action, payload) {
    return request(`/adapters/${adapterId}/${action}`, {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
    });
}
