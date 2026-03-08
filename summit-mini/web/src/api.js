"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingest = ingest;
exports.getGraph = getGraph;
exports.getReceipts = getReceipts;
exports.getDecisions = getDecisions;
async function ingest(payload) {
    const r = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!r.ok) {
        throw new Error(await r.text());
    }
    return r.json();
}
async function getGraph() {
    const r = await fetch("/api/graph");
    return r.json();
}
async function getReceipts() {
    const r = await fetch("/api/receipts");
    return r.json();
}
async function getDecisions() {
    const r = await fetch("/api/decisions");
    return r.json();
}
