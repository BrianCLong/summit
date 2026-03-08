"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeArtifacts = writeArtifacts;
const firewall_1 = require("./firewall");
async function writeArtifacts(store, writeset) {
    try {
        return await (0, firewall_1.applyCogWriteSet)(store, writeset);
    }
    catch (error) {
        return {
            ok: false,
            writesetId: writeset.writesetId,
            summary: {
                receivedOps: writeset.ops.length,
                acceptedOps: 0,
                rejectedOps: writeset.ops.length,
            },
            items: [
                {
                    opId: 'RUNTIME',
                    status: 'REJECTED',
                    errors: [
                        {
                            code: 'RUNTIME_ERROR',
                            message: error?.message ?? 'unknown runtime error',
                        },
                    ],
                },
            ],
        };
    }
}
