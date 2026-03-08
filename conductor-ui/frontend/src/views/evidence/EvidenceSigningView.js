"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceSigningView = void 0;
// conductor-ui/frontend/src/views/evidence/EvidenceSigningView.tsx
const react_1 = __importStar(require("react"));
// Mock APIs
const signEvidence = async (runId) => {
    console.log(`Requesting server-side signature for run ${runId}...`);
    await new Promise((res) => setTimeout(res, 800));
    return {
        signature: 'z123...abc',
        signer: 'prod-signer-service-v2',
        timestamp: new Date().toISOString(),
    };
};
const verifySignature = async (signatureInfo) => {
    console.log(`Verifying signature from ${signatureInfo.signer}...`);
    await new Promise((res) => setTimeout(res, 500));
    // In a real app, this would involve crypto against a trust store.
    if (signatureInfo.signer.includes('prod')) {
        return {
            isValid: true,
            message: 'Signature verified against production trust store.',
            checkedAt: new Date().toISOString(),
        };
    }
    return {
        isValid: false,
        message: 'Signer is not in the trusted set.',
        checkedAt: new Date().toISOString(),
    };
};
const EvidenceSigningView = ({ runId }) => {
    const [signatureInfo, setSignatureInfo] = (0, react_1.useState)(null);
    const [verificationInfo, setVerificationInfo] = (0, react_1.useState)(null);
    const [isSigning, setIsSigning] = (0, react_1.useState)(false);
    const [isVerifying, setIsVerifying] = (0, react_1.useState)(false);
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
    return (<div>
      <h2>Evidence Signing & Verification</h2>
      <p>
        <strong>Run ID:</strong> {runId}
      </p>

      <button onClick={handleSign} disabled={isSigning || isVerifying}>
        {isSigning ? 'Signing...' : 'Generate Server-Side Signature'}
      </button>

      {signatureInfo && (<div className="signature-details">
          <h3>Signature Generated</h3>
          <p>
            <strong>Signer:</strong> {signatureInfo.signer}
          </p>
          <p>
            <strong>Timestamp:</strong> {signatureInfo.timestamp}
          </p>
          <p>
            <strong>Signature:</strong> <pre>{signatureInfo.signature}</pre>
          </p>
          <button onClick={handleVerify} disabled={isVerifying || !signatureInfo}>
            {isVerifying ? 'Verifying...' : 'Verify Signature'}
          </button>
        </div>)}

      {verificationInfo && (<div style={{
                border: `2px solid ${verificationInfo.isValid ? 'green' : 'red'}`,
            }}>
          <h3>Verification Result</h3>
          <p>
            <strong>Status:</strong>{' '}
            {verificationInfo.isValid ? 'VALID' : 'INVALID'}
          </p>
          <p>
            <strong>Details:</strong> {verificationInfo.message}
          </p>
          <p>
            <strong>Checked At:</strong> {verificationInfo.checkedAt}
          </p>
        </div>)}
    </div>);
};
exports.EvidenceSigningView = EvidenceSigningView;
