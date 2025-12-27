/**
 * @typedef {Object} JSONSchema
 * @property {string} [$id]
 * @property {string} [$schema]
 * @property {string} [title]
 * @property {string|string[]} [type]
 * @property {Record<string, JSONSchema>} [properties]
 * @property {string[]} [required]
 * @property {Array<string|number|boolean|null>} [enum]
 * @property {string} ['x-version']
 * @property {Record<string,string>} ['x-classification']
 */

/** @typedef {'required.removed'|'property.missing'|'type.narrowed'|'enum.value.removed'|'semantics.changed'} SchemaChangeCode */

/**
 * @typedef {Object} SchemaChange
 * @property {SchemaChangeCode} code
 * @property {string} path
 * @property {'breaking'|'info'} severity
 * @property {string} message
 * @property {boolean} [allowed]
 * @property {Record<string, unknown>} [details]
 */

/**
 * @typedef {Object} SchemaDiffResult
 * @property {string} file
 * @property {SchemaChange[]} breaking
 * @property {SchemaChange[]} nonBreaking
 * @property {string} [version]
 * @property {string} [baselineVersion]
 */

/**
 * @typedef {Object} DirectoryDiffResult
 * @property {SchemaChange[]} breaking
 * @property {SchemaChange[]} nonBreaking
 * @property {SchemaDiffResult[]} results
 * @property {boolean} versionBumped
 * @property {SchemaChange[]} unresolved
 * @property {SchemaChange[]} allowed
 */

/**
 * @typedef {Object} CompatibilityEntry
 * @property {SchemaChangeCode} code
 * @property {string} path
 * @property {string} [rationale]
 */

/**
 * @typedef {Object} CompatibilityMap
 * @property {CompatibilityEntry[]} [allow]
 */

/**
 * @typedef {Object} ComparisonOptions
 * @property {string} baselineDir
 * @property {string} currentDir
 * @property {CompatibilityMap} [compatibility]
 */

export {}; // documentation-only module
