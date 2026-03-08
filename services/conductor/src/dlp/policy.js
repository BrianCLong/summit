"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceDlp = enforceDlp;
function enforceDlp(findings, mode, content) {
    if (!findings.length || mode === 'allow')
        return { ok: true, content };
    if (mode === 'block')
        return { ok: false, reason: 'dlp.block' };
    // redact
    let s = content.toString('utf8');
    s = s
        .replace(/\d{3}-\d{2}-\d{4}/g, 'XXX-XX-XXXX')
        .replace(/\b(?:\d[ -]*?){13,16}\b/g, 'XXXX-XXXX-XXXX-XXXX');
    return { ok: true, content: Buffer.from(s) };
}
