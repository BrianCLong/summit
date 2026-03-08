"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExportJob = createExportJob;
exports.fetchExportJob = fetchExportJob;
exports.cancelExportJob = cancelExportJob;
exports.triggerDownload = triggerDownload;
const exportUtils_1 = require("@/lib/exportUtils");
async function createExportJob(params) {
    const { tenantId, caseId, paramsHash, idempotencyKey: explicitKey, ...body } = params;
    const idempotencyKey = explicitKey ?? (0, exportUtils_1.deriveIdempotencyKey)(tenantId, caseId, paramsHash);
    const response = await fetch(`/api/tenants/${tenantId}/cases/${caseId}/exports`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({ ...body, idempotencyKey }),
    });
    if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Failed to create export job: ${message}`);
    }
    return response.json();
}
async function fetchExportJob(tenantId, caseId, jobId) {
    const response = await fetch(`/api/tenants/${tenantId}/cases/${caseId}/exports/${jobId}`);
    if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Failed to fetch export status: ${message}`);
    }
    return response.json();
}
async function cancelExportJob(tenantId, caseId, jobId) {
    const response = await fetch(`/api/tenants/${tenantId}/cases/${caseId}/exports/${jobId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Failed to cancel export job: ${message}`);
    }
}
async function triggerDownload(url, filename) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || '';
    anchor.rel = 'noopener noreferrer';
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}
