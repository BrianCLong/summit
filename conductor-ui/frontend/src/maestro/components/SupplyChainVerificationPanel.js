import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { useSupplyChainVerification } from '../utils/supplyChainVerification';
const SupplyChainVerificationPanel = ({ runId, artifacts = [], className = '' }) => {
  const { isVerifying, results, batchVerify, generateReport, clearResults } =
    useSupplyChainVerification();
  const [reportData, setReportData] = useState(null);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [verificationOptions, setVerificationOptions] = useState({
    requireSBOM: true,
    requireSLSA: true,
    minSLSALevel: 2,
    allowedIssuers: ['https://accounts.google.com', 'https://login.microsoftonline.com'],
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
  const getStatusColor = (verified) => {
    return verified ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };
  const getSeverityColor = (severity) => {
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
  const renderVerificationStatus = (result) => {
    return _jsxs('div', {
      className: 'space-y-3',
      children: [
        _jsxs('div', {
          className: 'bg-white border rounded-lg p-4',
          children: [
            _jsxs('div', {
              className: 'flex items-center justify-between mb-2',
              children: [
                _jsx('h4', {
                  className: 'font-medium text-gray-900',
                  children: 'Cosign Signature',
                }),
                _jsx('span', {
                  className: `px-2 py-1 rounded-full text-xs font-medium ${
                    result.cosignVerification?.signatureValid
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`,
                  children: result.cosignVerification?.signatureValid ? 'Valid' : 'Invalid',
                }),
              ],
            }),
            result.cosignVerification &&
              _jsxs('div', {
                className: 'grid grid-cols-2 gap-4 text-sm',
                children: [
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'Signature:' }),
                      _jsx('span', {
                        className: `ml-2 ${result.cosignVerification.signatureValid ? 'text-green-600' : 'text-red-600'}`,
                        children: result.cosignVerification.signatureValid
                          ? '✓ Valid'
                          : '✗ Invalid',
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'Certificate:' }),
                      _jsx('span', {
                        className: `ml-2 ${result.cosignVerification.certificateValid ? 'text-green-600' : 'text-red-600'}`,
                        children: result.cosignVerification.certificateValid
                          ? '✓ Valid'
                          : '✗ Invalid',
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'Rekor Entry:' }),
                      _jsx('span', {
                        className: `ml-2 ${result.cosignVerification.rekorEntryValid ? 'text-green-600' : 'text-red-600'}`,
                        children: result.cosignVerification.rekorEntryValid
                          ? '✓ Valid'
                          : '✗ Invalid',
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'Issuer:' }),
                      _jsx('span', {
                        className: 'ml-2 text-gray-900 font-mono text-xs',
                        children: result.cosignVerification.fulcioIssuer || 'N/A',
                      }),
                    ],
                  }),
                ],
              }),
          ],
        }),
        _jsxs('div', {
          className: 'bg-white border rounded-lg p-4',
          children: [
            _jsxs('div', {
              className: 'flex items-center justify-between mb-2',
              children: [
                _jsx('h4', {
                  className: 'font-medium text-gray-900',
                  children: 'SBOM (Software Bill of Materials)',
                }),
                _jsx('span', {
                  className: `px-2 py-1 rounded-full text-xs font-medium ${
                    result.sbomVerification?.valid
                      ? 'bg-green-100 text-green-800'
                      : result.sbomVerification?.present
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`,
                  children: result.sbomVerification?.valid
                    ? 'Valid'
                    : result.sbomVerification?.present
                      ? 'Invalid'
                      : 'Not Present',
                }),
              ],
            }),
            result.sbomVerification &&
              _jsxs('div', {
                className: 'space-y-2 text-sm',
                children: [
                  _jsxs('div', {
                    className: 'flex justify-between',
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'Components:' }),
                      _jsx('span', {
                        className: 'font-medium',
                        children: result.sbomVerification.componentsCount,
                      }),
                    ],
                  }),
                  result.sbomVerification.vulnerabilities &&
                    result.sbomVerification.vulnerabilities.length > 0 &&
                    _jsxs('div', {
                      children: [
                        _jsx('span', { className: 'text-gray-500', children: 'Vulnerabilities:' }),
                        _jsxs('div', {
                          className: 'mt-1 space-y-1',
                          children: [
                            result.sbomVerification.vulnerabilities
                              .slice(0, 5)
                              .map((vuln, idx) =>
                                _jsxs(
                                  'div',
                                  {
                                    className: 'flex items-center justify-between text-xs',
                                    children: [
                                      _jsx('span', { className: 'font-mono', children: vuln.id }),
                                      _jsx('span', {
                                        className: `px-2 py-1 rounded ${getSeverityColor(vuln.severity)}`,
                                        children: vuln.severity,
                                      }),
                                    ],
                                  },
                                  idx,
                                ),
                              ),
                            result.sbomVerification.vulnerabilities.length > 5 &&
                              _jsxs('div', {
                                className: 'text-xs text-gray-500',
                                children: [
                                  '...and ',
                                  result.sbomVerification.vulnerabilities.length - 5,
                                  ' more',
                                ],
                              }),
                          ],
                        }),
                      ],
                    }),
                ],
              }),
          ],
        }),
        _jsxs('div', {
          className: 'bg-white border rounded-lg p-4',
          children: [
            _jsxs('div', {
              className: 'flex items-center justify-between mb-2',
              children: [
                _jsx('h4', { className: 'font-medium text-gray-900', children: 'SLSA Provenance' }),
                _jsxs('div', {
                  className: 'flex items-center space-x-2',
                  children: [
                    result.slsaVerification?.level &&
                      _jsxs('span', {
                        className:
                          'px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800',
                        children: ['Level ', result.slsaVerification.level],
                      }),
                    _jsx('span', {
                      className: `px-2 py-1 rounded-full text-xs font-medium ${
                        result.slsaVerification?.valid
                          ? 'bg-green-100 text-green-800'
                          : result.slsaVerification?.present
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`,
                      children: result.slsaVerification?.valid
                        ? 'Valid'
                        : result.slsaVerification?.present
                          ? 'Invalid'
                          : 'Not Present',
                    }),
                  ],
                }),
              ],
            }),
            result.slsaVerification &&
              result.slsaVerification.present &&
              _jsxs('div', {
                className: 'grid grid-cols-2 gap-4 text-sm',
                children: [
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'Build Platform:' }),
                      _jsx('span', {
                        className: 'ml-2 font-mono text-xs',
                        children: result.slsaVerification.buildPlatform,
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'Source Repository:' }),
                      _jsx('span', {
                        className: 'ml-2 font-mono text-xs',
                        children: result.slsaVerification.sourceRepository,
                      }),
                    ],
                  }),
                ],
              }),
          ],
        }),
        (result.errors.length > 0 || result.warnings.length > 0) &&
          _jsxs('div', {
            className: 'bg-white border rounded-lg p-4',
            children: [
              _jsx('h4', { className: 'font-medium text-gray-900 mb-2', children: 'Issues' }),
              result.errors.length > 0 &&
                _jsxs('div', {
                  className: 'mb-2',
                  children: [
                    _jsx('h5', {
                      className: 'text-sm font-medium text-red-600 mb-1',
                      children: 'Errors:',
                    }),
                    _jsx('ul', {
                      className: 'text-xs text-red-600 space-y-1',
                      children: result.errors.map((error, idx) =>
                        _jsxs('li', { children: ['\u2022 ', error] }, idx),
                      ),
                    }),
                  ],
                }),
              result.warnings.length > 0 &&
                _jsxs('div', {
                  children: [
                    _jsx('h5', {
                      className: 'text-sm font-medium text-yellow-600 mb-1',
                      children: 'Warnings:',
                    }),
                    _jsx('ul', {
                      className: 'text-xs text-yellow-600 space-y-1',
                      children: result.warnings.map((warning, idx) =>
                        _jsxs('li', { children: ['\u2022 ', warning] }, idx),
                      ),
                    }),
                  ],
                }),
            ],
          }),
      ],
    });
  };
  return _jsxs('div', {
    className: `supply-chain-verification ${className}`,
    children: [
      _jsx('div', {
        className: 'bg-white border-b px-6 py-4',
        children: _jsxs('div', {
          className: 'flex items-center justify-between',
          children: [
            _jsxs('div', {
              children: [
                _jsx('h3', {
                  className: 'text-lg font-semibold text-gray-900',
                  children: 'Supply Chain Verification',
                }),
                _jsx('p', {
                  className: 'text-sm text-gray-600',
                  children: 'Cosign signatures, SBOM analysis, and SLSA provenance verification',
                }),
              ],
            }),
            _jsxs('div', {
              className: 'flex items-center space-x-3',
              children: [
                reportData &&
                  _jsxs('div', {
                    className: 'flex items-center space-x-4 text-sm',
                    children: [
                      _jsxs('div', {
                        className: 'flex items-center',
                        children: [
                          _jsx('div', { className: 'w-2 h-2 bg-green-500 rounded-full mr-1' }),
                          _jsxs('span', { children: [reportData.summary.verified, ' Verified'] }),
                        ],
                      }),
                      _jsxs('div', {
                        className: 'flex items-center',
                        children: [
                          _jsx('div', { className: 'w-2 h-2 bg-red-500 rounded-full mr-1' }),
                          _jsxs('span', { children: [reportData.summary.failed, ' Failed'] }),
                        ],
                      }),
                    ],
                  }),
                _jsxs('button', {
                  onClick: handleVerifyAll,
                  disabled: isVerifying || artifacts.length === 0,
                  className:
                    'px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center',
                  children: [
                    isVerifying &&
                      _jsxs('svg', {
                        className: 'animate-spin -ml-1 mr-2 h-4 w-4 text-white',
                        fill: 'none',
                        viewBox: '0 0 24 24',
                        children: [
                          _jsx('circle', {
                            className: 'opacity-25',
                            cx: '12',
                            cy: '12',
                            r: '10',
                            stroke: 'currentColor',
                            strokeWidth: '4',
                          }),
                          _jsx('path', {
                            className: 'opacity-75',
                            fill: 'currentColor',
                            d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
                          }),
                        ],
                      }),
                    isVerifying ? 'Verifying...' : 'Verify All',
                  ],
                }),
              ],
            }),
          ],
        }),
      }),
      _jsx('div', {
        className: 'bg-gray-50 px-6 py-3 border-b',
        children: _jsxs('div', {
          className: 'flex flex-wrap items-center gap-4 text-sm',
          children: [
            _jsxs('label', {
              className: 'flex items-center',
              children: [
                _jsx('input', {
                  type: 'checkbox',
                  checked: verificationOptions.requireSBOM,
                  onChange: (e) =>
                    setVerificationOptions((prev) => ({
                      ...prev,
                      requireSBOM: e.target.checked,
                    })),
                  className: 'mr-2',
                }),
                'Require SBOM',
              ],
            }),
            _jsxs('label', {
              className: 'flex items-center',
              children: [
                _jsx('input', {
                  type: 'checkbox',
                  checked: verificationOptions.requireSLSA,
                  onChange: (e) =>
                    setVerificationOptions((prev) => ({
                      ...prev,
                      requireSLSA: e.target.checked,
                    })),
                  className: 'mr-2',
                }),
                'Require SLSA',
              ],
            }),
            _jsxs('label', {
              className: 'flex items-center',
              children: [
                _jsx('span', { className: 'mr-2', children: 'Min SLSA Level:' }),
                _jsxs('select', {
                  value: verificationOptions.minSLSALevel,
                  onChange: (e) =>
                    setVerificationOptions((prev) => ({
                      ...prev,
                      minSLSALevel: parseInt(e.target.value),
                    })),
                  className: 'border rounded px-2 py-1',
                  children: [
                    _jsx('option', { value: '1', children: '1' }),
                    _jsx('option', { value: '2', children: '2' }),
                    _jsx('option', { value: '3', children: '3' }),
                    _jsx('option', { value: '4', children: '4' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      }),
      reportData &&
        _jsx('div', {
          className: 'bg-white border-b px-6 py-4',
          children: _jsxs('div', {
            className: 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4',
            children: [
              _jsxs('div', {
                className: 'text-center',
                children: [
                  _jsx('div', {
                    className: 'text-2xl font-bold text-gray-900',
                    children: reportData.summary.total,
                  }),
                  _jsx('div', { className: 'text-xs text-gray-500', children: 'Total Artifacts' }),
                ],
              }),
              _jsxs('div', {
                className: 'text-center',
                children: [
                  _jsx('div', {
                    className: 'text-2xl font-bold text-green-600',
                    children: reportData.summary.verified,
                  }),
                  _jsx('div', { className: 'text-xs text-gray-500', children: 'Verified' }),
                ],
              }),
              _jsxs('div', {
                className: 'text-center',
                children: [
                  _jsx('div', {
                    className: 'text-2xl font-bold text-red-600',
                    children: reportData.summary.failed,
                  }),
                  _jsx('div', { className: 'text-xs text-gray-500', children: 'Failed' }),
                ],
              }),
              _jsxs('div', {
                className: 'text-center',
                children: [
                  _jsx('div', {
                    className: 'text-2xl font-bold text-blue-600',
                    children: reportData.summary.withSBOM,
                  }),
                  _jsx('div', { className: 'text-xs text-gray-500', children: 'With SBOM' }),
                ],
              }),
              _jsxs('div', {
                className: 'text-center',
                children: [
                  _jsx('div', {
                    className: 'text-2xl font-bold text-purple-600',
                    children: reportData.summary.withSLSA,
                  }),
                  _jsx('div', { className: 'text-xs text-gray-500', children: 'With SLSA' }),
                ],
              }),
              _jsxs('div', {
                className: 'text-center',
                children: [
                  _jsx('div', {
                    className: 'text-2xl font-bold text-orange-600',
                    children: reportData.summary.criticalVulnerabilities,
                  }),
                  _jsx('div', { className: 'text-xs text-gray-500', children: 'Critical Vulns' }),
                ],
              }),
            ],
          }),
        }),
      _jsx('div', {
        className: 'bg-white',
        children:
          artifacts.length === 0
            ? _jsxs('div', {
                className: 'px-6 py-8 text-center text-gray-500',
                children: [
                  _jsx('svg', {
                    className: 'mx-auto h-12 w-12 text-gray-400 mb-4',
                    fill: 'none',
                    stroke: 'currentColor',
                    viewBox: '0 0 48 48',
                    children: _jsx('path', {
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      strokeWidth: 2,
                      d: 'M20 7l-8-4-8 4 8 4 8-4zm0 18l8-4-8-4-8 4 8 4zm0 18l8-4-8-4-8 4 8 4z',
                    }),
                  }),
                  _jsx('p', { children: 'No artifacts to verify for this run.' }),
                  _jsx('p', {
                    className: 'text-sm mt-1',
                    children:
                      'Supply chain verification will appear here when artifacts are available.',
                  }),
                ],
              })
            : _jsx('div', {
                className: 'divide-y',
                children: results.map((result, index) =>
                  _jsxs(
                    'div',
                    {
                      className: 'px-6 py-4',
                      children: [
                        _jsxs('div', {
                          className: 'flex items-start justify-between mb-3',
                          children: [
                            _jsxs('div', {
                              className: 'flex-1 min-w-0',
                              children: [
                                _jsx('h4', {
                                  className: 'text-sm font-medium text-gray-900 truncate',
                                  children: result.artifact,
                                }),
                                _jsxs('p', {
                                  className: 'text-xs text-gray-500 mt-1',
                                  children: [
                                    'Verified: ',
                                    new Date(result.timestamp).toLocaleString(),
                                  ],
                                }),
                              ],
                            }),
                            _jsxs('div', {
                              className: 'flex items-center space-x-2 ml-4',
                              children: [
                                _jsx('span', {
                                  className: `px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.verified)}`,
                                  children: result.verified ? '✓ Verified' : '✗ Failed',
                                }),
                                _jsx('button', {
                                  onClick: () =>
                                    setSelectedArtifact(
                                      selectedArtifact === result.artifact ? null : result.artifact,
                                    ),
                                  className:
                                    'text-blue-600 hover:text-blue-800 text-sm font-medium',
                                  children:
                                    selectedArtifact === result.artifact
                                      ? 'Hide Details'
                                      : 'Show Details',
                                }),
                              ],
                            }),
                          ],
                        }),
                        selectedArtifact === result.artifact && renderVerificationStatus(result),
                      ],
                    },
                    index,
                  ),
                ),
              }),
      }),
      isVerifying &&
        _jsx('div', {
          className: 'absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center',
          children: _jsxs('div', {
            className: 'text-center',
            children: [
              _jsxs('svg', {
                className: 'animate-spin h-8 w-8 text-blue-600 mx-auto mb-2',
                fill: 'none',
                viewBox: '0 0 24 24',
                children: [
                  _jsx('circle', {
                    className: 'opacity-25',
                    cx: '12',
                    cy: '12',
                    r: '10',
                    stroke: 'currentColor',
                    strokeWidth: '4',
                  }),
                  _jsx('path', {
                    className: 'opacity-75',
                    fill: 'currentColor',
                    d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
                  }),
                ],
              }),
              _jsx('p', {
                className: 'text-sm text-gray-600',
                children: 'Verifying supply chain integrity...',
              }),
            ],
          }),
        }),
    ],
  });
};
export default SupplyChainVerificationPanel;
