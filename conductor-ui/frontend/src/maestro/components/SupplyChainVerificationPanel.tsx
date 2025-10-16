import React, { useState, useEffect } from 'react';
import {
  useSupplyChainVerification,
  SupplyChainVerificationResult,
} from '../utils/supplyChainVerification';

interface SupplyChainVerificationPanelProps {
  runId: string;
  artifacts?: string[];
  className?: string;
}

const SupplyChainVerificationPanel: React.FC<
  SupplyChainVerificationPanelProps
> = ({ runId, artifacts = [], className = '' }) => {
  const { isVerifying, results, batchVerify, generateReport, clearResults } =
    useSupplyChainVerification();

  const [reportData, setReportData] = useState<any>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [verificationOptions, setVerificationOptions] = useState({
    requireSBOM: true,
    requireSLSA: true,
    minSLSALevel: 2,
    allowedIssuers: [
      'https://accounts.google.com',
      'https://login.microsoftonline.com',
    ],
    maxAge: 168, // 7 days
  });

  useEffect(() => {
    if (artifacts.length > 0) {
      handleVerifyAll();
    }
  }, [artifacts]);

  useEffect(() => {
    if (results.length > 0) {
      generateReport().then(setReportData);
    }
  }, [results, generateReport]);

  const handleVerifyAll = async () => {
    clearResults();
    if (artifacts.length > 0) {
      await batchVerify(artifacts, verificationOptions);
    }
  };

  const getStatusColor = (verified: boolean) => {
    return verified ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderVerificationStatus = (result: SupplyChainVerificationResult) => {
    return (
      <div className="space-y-3">
        {/* Cosign Status */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">Cosign Signature</h4>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                result.cosignVerification?.signatureValid
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {result.cosignVerification?.signatureValid ? 'Valid' : 'Invalid'}
            </span>
          </div>

          {result.cosignVerification && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Signature:</span>
                <span
                  className={`ml-2 ${result.cosignVerification.signatureValid ? 'text-green-600' : 'text-red-600'}`}
                >
                  {result.cosignVerification.signatureValid
                    ? '✓ Valid'
                    : '✗ Invalid'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Certificate:</span>
                <span
                  className={`ml-2 ${result.cosignVerification.certificateValid ? 'text-green-600' : 'text-red-600'}`}
                >
                  {result.cosignVerification.certificateValid
                    ? '✓ Valid'
                    : '✗ Invalid'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Rekor Entry:</span>
                <span
                  className={`ml-2 ${result.cosignVerification.rekorEntryValid ? 'text-green-600' : 'text-red-600'}`}
                >
                  {result.cosignVerification.rekorEntryValid
                    ? '✓ Valid'
                    : '✗ Invalid'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Issuer:</span>
                <span className="ml-2 text-gray-900 font-mono text-xs">
                  {result.cosignVerification.fulcioIssuer || 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* SBOM Status */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">
              SBOM (Software Bill of Materials)
            </h4>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                result.sbomVerification?.valid
                  ? 'bg-green-100 text-green-800'
                  : result.sbomVerification?.present
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {result.sbomVerification?.valid
                ? 'Valid'
                : result.sbomVerification?.present
                  ? 'Invalid'
                  : 'Not Present'}
            </span>
          </div>

          {result.sbomVerification && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Components:</span>
                <span className="font-medium">
                  {result.sbomVerification.componentsCount}
                </span>
              </div>

              {result.sbomVerification.vulnerabilities &&
                result.sbomVerification.vulnerabilities.length > 0 && (
                  <div>
                    <span className="text-gray-500">Vulnerabilities:</span>
                    <div className="mt-1 space-y-1">
                      {result.sbomVerification.vulnerabilities
                        .slice(0, 5)
                        .map((vuln, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="font-mono">{vuln.id}</span>
                            <span
                              className={`px-2 py-1 rounded ${getSeverityColor(vuln.severity)}`}
                            >
                              {vuln.severity}
                            </span>
                          </div>
                        ))}
                      {result.sbomVerification.vulnerabilities.length > 5 && (
                        <div className="text-xs text-gray-500">
                          ...and{' '}
                          {result.sbomVerification.vulnerabilities.length - 5}{' '}
                          more
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* SLSA Status */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">SLSA Provenance</h4>
            <div className="flex items-center space-x-2">
              {result.slsaVerification?.level && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Level {result.slsaVerification.level}
                </span>
              )}
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  result.slsaVerification?.valid
                    ? 'bg-green-100 text-green-800'
                    : result.slsaVerification?.present
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {result.slsaVerification?.valid
                  ? 'Valid'
                  : result.slsaVerification?.present
                    ? 'Invalid'
                    : 'Not Present'}
              </span>
            </div>
          </div>

          {result.slsaVerification && result.slsaVerification.present && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Build Platform:</span>
                <span className="ml-2 font-mono text-xs">
                  {result.slsaVerification.buildPlatform}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Source Repository:</span>
                <span className="ml-2 font-mono text-xs">
                  {result.slsaVerification.sourceRepository}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Errors and Warnings */}
        {(result.errors.length > 0 || result.warnings.length > 0) && (
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Issues</h4>

            {result.errors.length > 0 && (
              <div className="mb-2">
                <h5 className="text-sm font-medium text-red-600 mb-1">
                  Errors:
                </h5>
                <ul className="text-xs text-red-600 space-y-1">
                  {result.errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-yellow-600 mb-1">
                  Warnings:
                </h5>
                <ul className="text-xs text-yellow-600 space-y-1">
                  {result.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`supply-chain-verification ${className}`}>
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Supply Chain Verification
            </h3>
            <p className="text-sm text-gray-600">
              Cosign signatures, SBOM analysis, and SLSA provenance verification
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {reportData && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  <span>{reportData.summary.verified} Verified</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                  <span>{reportData.summary.failed} Failed</span>
                </div>
              </div>
            )}

            <button
              onClick={handleVerifyAll}
              disabled={isVerifying || artifacts.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isVerifying && (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isVerifying ? 'Verifying...' : 'Verify All'}
            </button>
          </div>
        </div>
      </div>

      {/* Verification Options */}
      <div className="bg-gray-50 px-6 py-3 border-b">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={verificationOptions.requireSBOM}
              onChange={(e) =>
                setVerificationOptions((prev) => ({
                  ...prev,
                  requireSBOM: e.target.checked,
                }))
              }
              className="mr-2"
            />
            Require SBOM
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={verificationOptions.requireSLSA}
              onChange={(e) =>
                setVerificationOptions((prev) => ({
                  ...prev,
                  requireSLSA: e.target.checked,
                }))
              }
              className="mr-2"
            />
            Require SLSA
          </label>

          <label className="flex items-center">
            <span className="mr-2">Min SLSA Level:</span>
            <select
              value={verificationOptions.minSLSALevel}
              onChange={(e) =>
                setVerificationOptions((prev) => ({
                  ...prev,
                  minSLSALevel: parseInt(e.target.value),
                }))
              }
              className="border rounded px-2 py-1"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>
        </div>
      </div>

      {/* Summary Stats */}
      {reportData && (
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {reportData.summary.total}
              </div>
              <div className="text-xs text-gray-500">Total Artifacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reportData.summary.verified}
              </div>
              <div className="text-xs text-gray-500">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {reportData.summary.failed}
              </div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reportData.summary.withSBOM}
              </div>
              <div className="text-xs text-gray-500">With SBOM</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {reportData.summary.withSLSA}
              </div>
              <div className="text-xs text-gray-500">With SLSA</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {reportData.summary.criticalVulnerabilities}
              </div>
              <div className="text-xs text-gray-500">Critical Vulns</div>
            </div>
          </div>
        </div>
      )}

      {/* Artifacts List */}
      <div className="bg-white">
        {artifacts.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4 8 4 8-4zm0 18l8-4-8-4-8 4 8 4zm0 18l8-4-8-4-8 4 8 4z"
              />
            </svg>
            <p>No artifacts to verify for this run.</p>
            <p className="text-sm mt-1">
              Supply chain verification will appear here when artifacts are
              available.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {results.map((result, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {result.artifact}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Verified: {new Date(result.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.verified)}`}
                    >
                      {result.verified ? '✓ Verified' : '✗ Failed'}
                    </span>

                    <button
                      onClick={() =>
                        setSelectedArtifact(
                          selectedArtifact === result.artifact
                            ? null
                            : result.artifact,
                        )
                      }
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {selectedArtifact === result.artifact
                        ? 'Hide Details'
                        : 'Show Details'}
                    </button>
                  </div>
                </div>

                {selectedArtifact === result.artifact &&
                  renderVerificationStatus(result)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isVerifying && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-sm text-gray-600">
              Verifying supply chain integrity...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyChainVerificationPanel;
