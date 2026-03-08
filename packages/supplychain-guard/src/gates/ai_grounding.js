"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkNPMVersion = checkNPMVersion;
exports.evaluateAIGrounding = evaluateAIGrounding;
const child_process_1 = require("child_process");
async function checkNPMVersion(name, version) {
    try {
        // Check if version exists in the registry using npm view
        // This respects local .npmrc configuration
        const res = (0, child_process_1.spawnSync)('npm', ['view', `${name}@${version}`, 'version'], { stdio: 'ignore' });
        return res.status === 0;
    }
    catch (e) {
        return false;
    }
}
async function evaluateAIGrounding(recs, resolver = async (r) => {
    if (r.ecosystem === 'npm')
        return checkNPMVersion(r.name, r.version);
    // For MWS, we only implement npm. Others default to 'pass' to avoid blocking valid non-npm usage yet.
    return true;
}) {
    const findings = [];
    for (const r of recs) {
        const exists = await resolver(r);
        if (!exists) {
            findings.push(`Unresolvable recommendation: ${r.ecosystem}:${r.name}@${r.version}`);
        }
    }
    return { ok: findings.length === 0, findings };
}
