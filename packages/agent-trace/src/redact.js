"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactUrl = redactUrl;
const crypto_1 = require("crypto");
function redactUrl(url, allowlist = []) {
    try {
        const parsed = new URL(url);
        // Check allowlist
        if (allowlist.length > 0 && !allowlist.includes(parsed.host)) {
            throw new Error(`Domain ${parsed.host} is not in the allowlist`);
        }
        // Redact query and fragment
        const redactedUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
        const urlHash = (0, crypto_1.createHash)('sha256').update(url).digest('hex');
        return { redactedUrl, urlHash };
    }
    catch (err) {
        // If not a valid URL or other error, just return a hashed version of the original
        return {
            redactedUrl: 'redacted://hidden',
            urlHash: (0, crypto_1.createHash)('sha256').update(url).digest('hex')
        };
    }
}
