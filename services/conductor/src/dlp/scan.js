"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scan = scan;
const PAN = /\b(?:\d[ -]*?){13,16}\b/;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/;
function scan(buf) {
    const s = buf.toString('utf8');
    const findings = [];
    if (PAN.test(s))
        findings.push({ kind: 'PAN', severity: 'high' });
    if (SSN.test(s))
        findings.push({ kind: 'SSN', severity: 'high' });
    return findings;
}
