"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
async function run(_ctx) {
    const metaRaw = process.env.MCP_SANDBOX_METADATA;
    if (!metaRaw) {
        return {
            name: 'sandbox',
            pass: false,
            reason: 'MCP_SANDBOX_METADATA not set',
        };
    }
    try {
        const metadata = JSON.parse(metaRaw);
        return { name: 'sandbox', pass: true, metadata };
    }
    catch (error) {
        return {
            name: 'sandbox',
            pass: false,
            reason: `invalid MCP_SANDBOX_METADATA: ${error}`,
        };
    }
}
