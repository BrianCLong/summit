/**
 * @typedef {Object} ManifestTransform
 * @property {string} type
 * @property {string} input
 * @property {string} output
 * @property {string} sha256
 */

/**
 * @typedef {Object} ManifestEvidence
 * @property {string} id
 * @property {string} path
 * @property {string} [label]
 * @property {string} sha256
 */

/**
 * @typedef {Object} ManifestAsset
 * @property {string} id
 * @property {string} path
 * @property {string} [mediaType]
 * @property {string} sha256
 * @property {ManifestTransform[]} [transforms]
 * @property {string[]} [evidence]
 */

/**
 * @typedef {Object} ManifestDocument
 * @property {string} manifestVersion
 * @property {string} bundleId
 * @property {string} generatedAt
 * @property {string} [rootDocument]
 * @property {ManifestAsset[]} assets
 * @property {ManifestEvidence[]} [evidence]
 */

/**
 * @typedef {'missing-file' | 'hash-mismatch' | 'schema-invalid' | 'transform-link-broken' | 'path-traversal' | 'evidence-missing'} VerificationIssueCode
 */

/**
 * @typedef {Object} VerificationIssue
 * @property {VerificationIssueCode} code
 * @property {string} message
 * @property {string} [target]
 */

/**
 * @typedef {Object} VerificationReport
 * @property {string} manifestVersion
 * @property {boolean} valid
 * @property {VerificationIssue[]} issues
 * @property {number} checkedFiles
 */

export {};
