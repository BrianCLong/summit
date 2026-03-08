"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDriftReport = buildDriftReport;
const node_fs_1 = require("node:fs");
const URL_ALLOWLIST = new Set(['homepage', 'toolkit_page']);
function statusForUrl(url) {
    if (!url)
        return { status: 'warn', http: 0, notes: ['missing url'] };
    if (!/^https?:\/\//.test(url))
        return { status: 'fail', http: 0, notes: ['non-http url'] };
    return { status: 'ok', http: 200, notes: [] };
}
function buildDriftReport(inputPath = 'artifacts/toolkit/bellingcat.json') {
    const payload = JSON.parse((0, node_fs_1.readFileSync)(inputPath, 'utf8'));
    const results = payload.records.map((record) => {
        const checks = [...URL_ALLOWLIST].map((field) => statusForUrl(record[field]));
        const fail = checks.find((c) => c.status === 'fail');
        const warn = checks.find((c) => c.status === 'warn');
        const chosen = fail ?? warn ?? checks[0];
        return {
            tool_id: record.tool_id,
            status: chosen.status,
            http: chosen.http,
            notes: chosen.notes,
        };
    });
    const summary = {
        source: 'bellingcat',
        checked_tools: results.length,
        ok: results.filter((r) => r.status === 'ok').length,
        warn: results.filter((r) => r.status === 'warn').length,
        fail: results.filter((r) => r.status === 'fail').length,
        results,
    };
    (0, node_fs_1.mkdirSync)('artifacts/drift/bellingcat', { recursive: true });
    (0, node_fs_1.writeFileSync)('artifacts/drift/bellingcat/latest.json', `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    return summary;
}
if (typeof require !== 'undefined' && require.main === module) {
    buildDriftReport();
}
