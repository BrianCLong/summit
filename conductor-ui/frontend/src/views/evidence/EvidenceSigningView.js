import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/views/evidence/EvidenceSigningView.tsx
import { useState } from 'react';
// Mock APIs
const signEvidence = async (runId) => {
    console.log(`Requesting server-side signature for run ${runId}...`);
    await new Promise(res => setTimeout(res, 800));
    return {
        signature: 'z123...abc',
        signer: 'prod-signer-service-v2',
        timestamp: new Date().toISOString(),
    };
};
const verifySignature = async (signatureInfo) => {
    console.log(`Verifying signature from ${signatureInfo.signer}...`);
    await new Promise(res => setTimeout(res, 500));
    // In a real app, this would involve crypto against a trust store.
    if (signatureInfo.signer.includes('prod')) {
        return { isValid: true, message: 'Signature verified against production trust store.', checkedAt: new Date().toISOString() };
    }
    return { isValid: false, message: 'Signer is not in the trusted set.', checkedAt: new Date().toISOString() };
};
export const EvidenceSigningView = ({ runId }) => {
    const [signatureInfo, setSignatureInfo] = useState(null);
    const [verificationInfo, setVerificationInfo] = useState(null);
    const [isSigning, setIsSigning] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const handleSign = async () => {
        setIsSigning(true);
        setVerificationInfo(null);
        const result = await signEvidence(runId);
        setSignatureInfo(result);
        setIsSigning(false);
    };
    const handleVerify = async () => {
        if (!signatureInfo)
            return;
        setIsVerifying(true);
        const result = await verifySignature(signatureInfo);
        setVerificationInfo(result);
        setIsVerifying(false);
    };
    return (_jsxs("div", { children: [_jsx("h2", { children: "Evidence Signing & Verification" }), _jsxs("p", { children: [_jsx("strong", { children: "Run ID:" }), " ", runId] }), _jsx("button", { onClick: handleSign, disabled: isSigning || isVerifying, children: isSigning ? 'Signing...' : 'Generate Server-Side Signature' }), signatureInfo && (_jsxs("div", { className: "signature-details", children: [_jsx("h3", { children: "Signature Generated" }), _jsxs("p", { children: [_jsx("strong", { children: "Signer:" }), " ", signatureInfo.signer] }), _jsxs("p", { children: [_jsx("strong", { children: "Timestamp:" }), " ", signatureInfo.timestamp] }), _jsxs("p", { children: [_jsx("strong", { children: "Signature:" }), " ", _jsx("pre", { children: signatureInfo.signature })] }), _jsx("button", { onClick: handleVerify, disabled: isVerifying || !signatureInfo, children: isVerifying ? 'Verifying...' : 'Verify Signature' })] })), verificationInfo && (_jsxs("div", { style: { border: `2px solid ${verificationInfo.isValid ? 'green' : 'red'}` }, children: [_jsx("h3", { children: "Verification Result" }), _jsxs("p", { children: [_jsx("strong", { children: "Status:" }), " ", verificationInfo.isValid ? 'VALID' : 'INVALID'] }), _jsxs("p", { children: [_jsx("strong", { children: "Details:" }), " ", verificationInfo.message] }), _jsxs("p", { children: [_jsx("strong", { children: "Checked At:" }), " ", verificationInfo.checkedAt] })] }))] }));
};
