"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256Hex = sha256Hex;
exports.useHashVerifier = useHashVerifier;
exports.formatStepType = formatStepType;
const react_1 = require("react");
async function sha256Hex(payload) {
    const buffer = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}
function useHashVerifier() {
    const [verifying, setVerifying] = (0, react_1.useState)(null);
    const [verifiedStep, setVerifiedStep] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const verify = (0, react_1.useCallback)(async (step, materials, direction) => {
        setVerifying(`${step.id}-${direction}`);
        setError(null);
        setVerifiedStep(null);
        try {
            const expectedHash = direction === 'input' ? step.inputHash : step.outputHash;
            const material = direction === 'input' ? materials.input : materials.output;
            const hash = await sha256Hex(material);
            if (hash === expectedHash) {
                setVerifiedStep(step.id);
            }
            else {
                setError(`Hash mismatch. Expected ${expectedHash.substring(0, 12)}…, got ${hash.substring(0, 12)}…`);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to verify hash');
        }
        finally {
            setVerifying(null);
        }
    }, []);
    return { verifying, verifiedStep, error, verify };
}
function formatStepType(type) {
    switch (type) {
        case 'ingest':
            return 'Ingest';
        case 'transform':
            return 'Transform';
        case 'policy-check':
            return 'Policy Check';
        case 'export':
            return 'Export';
        default:
            return type;
    }
}
