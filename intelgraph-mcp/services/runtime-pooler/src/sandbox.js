"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSandboxContext = buildSandboxContext;
function buildSandboxContext(vmId, caps) {
    return {
        vmId,
        sandboxId: `sbx_${Math.random().toString(36).slice(2)}`,
        caps,
    };
}
