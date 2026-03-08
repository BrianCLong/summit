"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHtml = buildHtml;
function buildHtml({ title, manifestB64 }) {
    return `<!doctype html><html><body><h1>${title}</h1><p>Manifest (b64): ${manifestB64.slice(0, 32)}...</p></body></html>`;
}
