// conductor-ui/frontend/src/views/evidence/EvidenceSigningView.tsx
import React, { useState } from 'react';

type SignatureInfo = { signature: string; signer: string; timestamp: string };
type VerificationInfo = {
  isValid: boolean;
  message: string;
  checkedAt: string;
};

// Mock APIs
const signEvidence = async (runId: string): Promise<SignatureInfo> => {
  console.log(`Requesting server-side signature for run ${runId}...`);
  await new Promise((res) => setTimeout(res, 800));
  return {
    signature: 'z123...abc',
    signer: 'prod-signer-service-v2',
    timestamp: new Date().toISOString(),
  };
};

const verifySignature = async (
  signatureInfo: SignatureInfo,
): Promise<VerificationInfo> => {
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

export const EvidenceSigningView = ({ runId }: { runId: string }) => {
  const [signatureInfo, setSignatureInfo] = useState<SignatureInfo | null>(
    null,
  );
  const [verificationInfo, setVerificationInfo] =
    useState<VerificationInfo | null>(null);
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
    if (!signatureInfo) return;
    setIsVerifying(true);
    const result = await verifySignature(signatureInfo);
    setVerificationInfo(result);
    setIsVerifying(false);
  };

  return (
    <div>
      <h2>Evidence Signing & Verification</h2>
      <p>
        <strong>Run ID:</strong> {runId}
      </p>

      <button onClick={handleSign} disabled={isSigning || isVerifying}>
        {isSigning ? 'Signing...' : 'Generate Server-Side Signature'}
      </button>

      {signatureInfo && (
        <div className="signature-details">
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
          <button
            onClick={handleVerify}
            disabled={isVerifying || !signatureInfo}
          >
            {isVerifying ? 'Verifying...' : 'Verify Signature'}
          </button>
        </div>
      )}

      {verificationInfo && (
        <div
          style={{
            border: `2px solid ${verificationInfo.isValid ? 'green' : 'red'}`,
          }}
        >
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
        </div>
      )}
    </div>
  );
};
