"use strict";
// src/lib/api/maestro.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMaestroRequest = runMaestroRequest;
async function runMaestroRequest(params) {
    const res = await fetch('/api/maestro/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: params.userId,
            requestText: params.requestText,
        }),
        signal: params.signal,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Failed to run Maestro request: ${res.status} ${res.statusText} ${text}`);
    }
    return res.json();
}
