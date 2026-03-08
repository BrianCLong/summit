"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseManifest = parseManifest;
exports.parseChecksums = parseChecksums;
exports.isBrowser = isBrowser;
function parseManifest(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        // Basic validation could go here
        if (!data.tag || !data.sha) {
            throw new Error("Invalid manifest: missing tag or sha");
        }
        return data;
    }
    catch (e) {
        throw new Error(`Failed to parse manifest: ${e.message}`);
    }
}
function parseChecksums(content) {
    const lines = content.split('\n');
    const result = {};
    for (const line of lines) {
        if (!line.trim())
            continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            const sha = parts[0];
            const file = parts.slice(1).join(' ');
            result[file] = sha;
        }
    }
    return result;
}
function isBrowser() {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}
