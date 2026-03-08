"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDisclosureExport = createDisclosureExport;
exports.getDisclosureJob = getDisclosureJob;
exports.listDisclosureJobs = listDisclosureJobs;
exports.sendDisclosureAnalyticsEvent = sendDisclosureAnalyticsEvent;
exports.createRuntimeEvidenceBundle = createRuntimeEvidenceBundle;
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
async function handleResponse(response) {
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Request failed with status ${response.status}`);
    }
    return response.json();
}
async function createDisclosureExport(payload) {
    const response = await fetch(`${API_BASE}/disclosures/export`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-tenant-id': payload.tenantId,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(response);
    return body.job;
}
async function getDisclosureJob(tenantId, jobId) {
    const response = await fetch(`${API_BASE}/disclosures/export/${jobId}`, {
        headers: {
            'x-tenant-id': tenantId,
        },
        credentials: 'include',
    });
    const body = await handleResponse(response);
    return body.job;
}
async function listDisclosureJobs(tenantId) {
    const response = await fetch(`${API_BASE}/disclosures/export`, {
        headers: {
            'x-tenant-id': tenantId,
        },
        credentials: 'include',
    });
    const body = await handleResponse(response);
    return body.jobs;
}
async function sendDisclosureAnalyticsEvent(event, tenantId, context) {
    try {
        const payload = JSON.stringify({ event, tenantId, context });
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(`${API_BASE}/disclosures/analytics`, blob);
            return;
        }
        await fetch(`${API_BASE}/disclosures/analytics`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-tenant-id': tenantId,
            },
            credentials: 'include',
            body: payload,
        });
    }
    catch (error) {
        console.warn('Disclosure analytics event failed', error);
    }
}
async function createRuntimeEvidenceBundle(payload) {
    const response = await fetch(`${API_BASE}/disclosures/runtime-bundle`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-tenant-id': payload.tenantId,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(response);
    return body.bundle;
}
