#!/usr/bin/env node

/**
 * Evidence ID Consistency Verification Script
 * Validates that all Evidence-IDs in governance documents have corresponding mappings
 */

import { createHash } from 'node:crypto';
import { existsSync, promises as fs } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

// Debug logging utility
const DEBUG = process.env.EVIDENCE_DEBUG === 'true' || process.argv.includes('--debug');
function debugLog(message) {
  if (DEBUG) {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
  }
}

/**
 * Deterministic string comparison using codepoint ordering (not locale-dependent)
 * Provides total order for cross-platform determinism
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareStringsCodepoint(a, b) {
  if (a === b) return 0;
  if (typeof a !== 'string' || typeof b !== 'string') {
    a = String(a || '');
    b = String(b || '');
  }
  return a < b ? -1 : 1;
}

/**
 * Canonical JSON serialization to ensure deterministic output
 * Recursively sorts object keys and avoids nondeterministic ordering
 */
function canonicalJsonStringify(obj) {
  if (obj === null) return 'null';

  if (Array.isArray(obj)) {
    // Serialize array elements with canonical serialization
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }

  if (typeof obj === 'object') {
    // Sort keys deterministically using codepoint comparison
    const sorted = {};
    const keys = Object.keys(obj).sort(compareStringsCodepoint);
    for (const key of keys) {
      sorted[key] = canonicalJsonStringify(obj[key]);
    }

    const pairs = keys.map(key => {
      const valueStr = canonicalJsonStringify(obj[key]);
      return `"${escapeJsonString(key)}":${valueStr}`;
    });
    return '{' + pairs.join(',') + '}';
  }

  // For primitive types, use standard JSON serialization
  return JSON.stringify(obj);
}

/**
 * Escape string for JSON serialization
 */
function escapeJsonString(str) {
  if (typeof str !== 'string') {
    str = String(str);
  }
  return str
    .replace(/[\\]/g, '\\\\')
    .replace(/["]/g, '\\"')
    .replace(/[\b]/g, '\\b')
    .replace(/[\f]/g, '\\f')
    .replace(/[\n]/g, '\\n')
    .replace(/[\r]/g, '\\r')
    .replace(/[\t]/g, '\\t');
}

/**
 * Validates the configuration object
 */
function validateConfig(config) {
  const errors = [];

  if (!config.governanceDir || typeof config.governanceDir !== 'string') {
    errors.push('governanceDir must be a valid string');
  }

  if (!config.evidenceMapPath || typeof config.evidenceMapPath !== 'string') {
    errors.push('evidenceMapPath must be a valid string');
  }

  if (!config.outputDir || typeof config.outputDir !== 'string') {
    errors.push('outputDir must be a valid string');
  }

  if (!config.repoRoot || typeof config.repoRoot !== 'string') {
    errors.push('repoRoot must be a valid string');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }

  debugLog(`Configuration validated successfully: ${JSON.stringify(config)}`);
}

// Determine the script's directory for resolving relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants for security and performance
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_EVIDENCE_IDS_PER_DOC = 50;
const MAX_CONCURRENT_FILES = 10;

/**
 * Remove BOM from text
 */
function removeBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

/**
 * Parse headers from document text (first 30 lines)
 */
function parseHeaders(text, maxHeaderLines = 30) {
  const headers = {};
  const lines = text.split(/\r?\n/).slice(0, maxHeaderLines);
  const headerLineRe = /^\s*(?:>\s*)?([^:*]+?)\s*:\s*(.+?)\s*$/;

  for (const line of lines) {
    const cleaned = line.replace(/\*\*|\*/g, '').replace(/_/g, '');
    const match = cleaned.match(headerLineRe);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key) {
        headers[key] = value;
      }
    }
  }
  return headers;
}

/**
 * Parse evidence IDs from a string value
 */
function parseEvidenceIds(evidenceValue) {
  if (!evidenceValue) return [];
  if (evidenceValue === 'none') return ['none'];

  return evidenceValue
    .toString()
    .split(',')
    .map(id => id.trim().replace(/['"]/g, ''))
    .filter(id => id.length > 0);
}

/**
 * Validate evidence ID format
 */
function isValidEvidenceIdFormat(id) {
  const evidenceIdRegex = /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*$/;
  return evidenceIdRegex.test(id);
}

/**
 * Validate file path security
 */
function validateFilePathSafety(filePath, basePath) {
  if (filePath.includes('../') || filePath.includes('..\\')) {
    throw new Error(`Unsafe path detected: ${filePath}`);
  }

  const normalized = resolve(basePath, filePath);
  const expectedRoot = resolve(basePath);

  if (!normalized.startsWith(expectedRoot)) {
    throw new Error(`Path escapes expected root: ${filePath}`);
  }

  return normalized;
}

/**
 * Load evidence mapping from file
 */
async function loadEvidenceMap(mapPath) {
  try {
    debugLog(`Attempting to load evidence map from: ${mapPath}`);

    if (!existsSync(mapPath)) {
      console.warn(`Evidence map not found at ${mapPath}, proceeding with empty map`);
      debugLog('Evidence map file does not exist, returning empty map');
      return new Map();
    }

    const content = await fs.readFile(mapPath, 'utf8');
    debugLog(`Loaded evidence map file, size: ${content.length} characters`);

    const cleanedContent = removeBOM(content);
    const parsed = yaml.load(cleanedContent) || {};

    // Convert to Map for faster lookup - handle both flat and structured YAML
    let map;
    if (parsed.evidence && Array.isArray(parsed.evidence)) {
      map = new Map(parsed.evidence.filter(item => item && item.id).map(item => [item.id, item]));
    } else {
      map = new Map(Object.entries(parsed));
    }

    debugLog(`Parsed evidence map with ${map.size} entries`);
    return map;
  } catch (error) {
    console.error(`Failed to load evidence map ${mapPath}: ${error.message}`);
    debugLog(`Load evidence map error: ${error.stack}`);
    throw new Error(`Evidence map loading failed: ${error.message}`);
  }
}

/**
 * Process a single governance document
 */
async function processGovernanceDocument(filePath, evidenceMap, repoRoot) {
  try {
    debugLog(`Processing document: ${filePath}`);
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      const relativePath = relative(repoRoot, filePath);
      debugLog(`File too large (${stats.size} bytes): ${relativePath}`);
      return {
        path: relativePath,
        violations: [{
          type: 'file_size_exceeded',
          message: `File exceeds maximum size limit of ${MAX_FILE_SIZE_BYTES} bytes (${stats.size} bytes)`,
          severity: 'error',
          details: { fileSize: stats.size, maxSize: MAX_FILE_SIZE_BYTES }
        }],
        evidence_ids: []
      };
    }

    const content = await fs.readFile(filePath, 'utf8');
    const cleanedContent = removeBOM(content);
    const headers = parseHeaders(cleanedContent);

    const evidenceRaw = headers['Evidence-IDs'] || headers['Evidence-Ids'] || headers['Evidence-ids'];
    const evidenceIds = parseEvidenceIds(evidenceRaw);

    debugLog(`Document ${filePath} has ${evidenceIds.length} evidence IDs: ${evidenceIds.join(', ')}`);

    // Validate evidence ID format and count
    const formatViolations = [];
    if (evidenceIds.length > MAX_EVIDENCE_IDS_PER_DOC) {
      formatViolations.push({
        type: 'too_many_evidence_ids',
        message: `Document contains ${evidenceIds.length} evidence IDs, exceeding limit of ${MAX_EVIDENCE_IDS_PER_DOC}`,
        severity: 'error',
        details: { count: evidenceIds.length, limit: MAX_EVIDENCE_IDS_PER_DOC }
      });
    }

    for (const [idx, id] of evidenceIds.entries()) {
      if (!isValidEvidenceIdFormat(id)) {
        formatViolations.push({
          type: 'invalid_evidence_id_format',
          message: `Evidence ID "${id}" at position ${idx} is not properly formatted`,
          evidence_id: id,
          severity: 'error',
          details: { position: idx, format: id }
        });
      }
    }

    // Check evidence ID existence in mapping
    const mappingViolations = [];
    for (const id of evidenceIds) {
      if (id !== 'none' && !evidenceMap.has(id)) {
        mappingViolations.push({
          type: 'missing_evidence_mapping',
          message: `Evidence ID "${id}" has no corresponding mapping in evidence registry`,
          evidence_id: id,
          severity: 'warning', // Could be warning instead of error depending on policy
          details: { evidenceId: id, registrySize: evidenceMap.size }
        });
      }
    }

    const allViolations = [...formatViolations, ...mappingViolations];

    if (allViolations.length > 0) {
      debugLog(`Document ${filePath} has ${allViolations.length} violations`);
    }

    const relativePath = relative(repoRoot, filePath);
    return {
      path: relativePath,
      violations: allViolations,
      evidence_ids: evidenceIds
    };
  } catch (error) {
    const relativePath = relative(repoRoot, filePath);
    debugLog(`Error processing document ${filePath}: ${error.message}`);
    return {
      path: relativePath,
      violations: [{
        type: 'processing_error',
        message: `Failed to process file: ${error.message}`,
        severity: 'error',
        details: { error: error.message, stack: error.stack, filePath }
      }],
      evidence_ids: []
    };
  }
}

/**
 * Find all governance documents in the repository using git if available, falling back to filesystem
 */
async function findGovernanceDocuments(rootDir, extension = '.md') {
  try {
    // First, try to use git to get a deterministic list of tracked files
    const { execSync } = await import('child_process');
    try {
      // Use a more robust git command that handles subdirectories correctly
      const stdout = execSync('git ls-files "docs/governance/*.md" "docs/governance/**/*.md"', {
        cwd: rootDir,
        encoding: 'utf8'
      });

      const gitFiles = stdout
        .split('\n')
        .filter(line => line.trim() !== '' && line.toLowerCase().endsWith(extension))
        .map(relPath => join(rootDir, relPath));

      if (gitFiles.length > 0) {
        // Use a Set to unique files in case both patterns match same files
        const uniqueFiles = [...new Set(gitFiles)];
        debugLog(`Found ${uniqueFiles.length} governance documents via git`);
        return uniqueFiles.sort();
      }
    } catch (e) {
      debugLog(`Git command failed: ${e.message}`);
    }

    throw new Error('No governance files found via git or git failed');
  } catch (gitError) {
    debugLog(`Git-based file discovery failed: ${gitError.message}, falling back to filesystem scan`);

    // Fallback to filesystem enumeration
    const documents = [];
    let totalFilesScanned = 0;

    async function walkDirectory(currentPath) {
      debugLog(`Scanning directory: ${currentPath}`);
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      // Process entries in deterministic, codepoint-based order for consistency
      for (const entry of entries.sort((a, b) => a.name === b.name ? 0 : a.name < b.name ? -1 : 1)) {
        const fullPath = join(currentPath, entry.name);
        const relativePath = relative(rootDir, fullPath);

        if (entry.isDirectory()) {
          // Skip certain directories deterministically
          const skipDirs = ['node_modules', '.git', 'dist', 'build', 'target', '.svn', 'artifacts'];
          if (skipDirs.includes(entry.name)) {
            debugLog(`Skipping directory: ${fullPath}`);
            continue;
          }
          await walkDirectory(fullPath);
        } else if (entry.isFile() && relativePath.endsWith(extension)) {
          totalFilesScanned++;
          // Check if it's in the governance directory (deterministic check)
          if (relativePath.includes('governance') || relativePath.includes('/gov/')) {
            debugLog(`Found governance document: ${relativePath}`);
            documents.push(fullPath);
          } else {
            debugLog(`Skipped non-governance document: ${relativePath}`);
          }
        }
      }
    }

    await walkDirectory(rootDir);
    debugLog(`Scanned ${totalFilesScanned} files, found ${documents.length} governance documents via filesystem`);

    // Use codepoint-based sorting for platform consistency
    return documents.sort((a, b) => a === b ? 0 : a < b ? -1 : 1);
  }
}

/**
 * Generate deterministic hash of policy/config
 */
function generateDeterministicHash(obj) {
  const sortedKeys = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sortedKeys);
    }

    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = Array.isArray(obj[key])
        ? obj[key].map(sortedKeys)
        : sortedKeys(obj[key]);
    });
    return sorted;
  };

  const normalized = sortedKeys(obj);
  return createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');
}

/**
 * Build standardized report
 */
function buildConsistencyReport({ sha, policyHash, results, config, evidenceMap }) {
  const normalizedResults = [...results]
    .map(result => ({
      path: result.path,
      violations: result.violations.sort((a, b) =>
        compareStringsCodepoint(a.type, b.type) || compareStringsCodepoint(a.message, b.message)
      ),
      evidence_ids: result.evidence_ids.sort(compareStringsCodepoint) // Sort evidence IDs deterministically
    }))
    .sort((a, b) => compareStringsCodepoint(a.path, b.path)); // Sort by path using codepoint comparison

  // Extract all evidence IDs referenced in documents (excluding 'none')
  const referencedEvidenceIds = new Set();
  for (const result of results) {
    for (const id of result.evidence_ids) {
      if (id !== 'none') {
        referencedEvidenceIds.add(id);
      }
    }
  }

  // Find orphaned evidence IDs (in registry but not referenced anywhere)
  const orphanedEvidenceIds = [];
  if (evidenceMap) {
    for (const [id, _] of evidenceMap.entries()) {
      if (!referencedEvidenceIds.has(id)) {
        orphanedEvidenceIds.push(id);
      }
    }
  }
  orphanedEvidenceIds.sort(compareStringsCodepoint);

  // Add violations for orphaned evidence IDs if any are found
  const allViolations = [...normalizedResults.flatMap(result => result.violations)];
  if (orphanedEvidenceIds.length > 0) {
    debugLog(`Detected ${orphanedEvidenceIds.length} orphaned evidence IDs: ${orphanedEvidenceIds.join(', ')}`);

    // Add orphaned ID violations to the report (could be in a separate results section or as global violations)
    for (const orphanedId of orphanedEvidenceIds) {
      allViolations.push({
        type: 'orphaned_evidence_id',
        message: `Evidence ID "${orphanedId}" exists in registry but is not referenced by any governance document`,
        evidence_id: orphanedId,
        severity: 'info'  // Or 'warning' depending on governance policy
      });
    }
  }

  const errors = allViolations.filter(v => v.severity === 'error');
  const warnings = allViolations.filter(v => v.severity === 'warning');
  const infos = allViolations.filter(v => v.severity === 'info');

  const status = errors.length > 0 ? 'fail' : 'pass';

  return {
    version: '1.0.0',
    generator: 'evidence-id-consistency-verifier',
    status,
    sha,
    policy_hash: policyHash,
    source: 'evidence-id-policy',
    config: config,
    totals: {
      documents_checked: normalizedResults.length,
      evidence_ids_found: normalizedResults.reduce((sum, r) => sum + r.evidence_ids.length, 0),
      evidence_ids_referenced: referencedEvidenceIds.size,
      evidence_ids_registered: evidenceMap ? evidenceMap.size : 0,
      evidence_ids_orphaned: orphanedEvidenceIds.length,
      violations: allViolations.length,
      errors: errors.length,
      warnings: warnings.length,
      infos: infos.length
    },
    results: normalizedResults,
    metadata: {
      summary: `Processed ${normalizedResults.length} documents, found ${errors.length} errors, ${warnings.length} warnings, and ${infos.length} info messages`,
      orphaned_ids: orphanedEvidenceIds,
      recommendations: errors.length > 0
        ? ['Fix all error violations before merging']
        : warnings.length > 0
          ? ['Address warnings for optimal governance health']
          : ['No critical issues detected']
    }
  };
}

/**
 * Write report in multiple formats
 */
async function writeReports(report, outputPath) {
  const jsonPath = join(outputPath, 'report.json');
  const mdPath = join(outputPath, 'report.md');
  const stampPath = join(outputPath, 'stamp.json');  // For workflow tracking

  const normalizeOutput = (content) =>
    content.endsWith('\n') ? content : `${content}\n`;

  const writeFileAtomic = async (filePath, content) => {
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, filePath);
  };

  // Ensure output directory exists
  await fs.mkdir(outputPath, { recursive: true });

  // Write JSON report with canonical serialization for deterministic output
  const canonicalReport = canonicalJsonStringify(report);
  await writeFileAtomic(jsonPath, normalizeOutput(canonicalReport));

  // Write Markdown report
  let mdContent = `# Evidence ID Consistency Report\n\n`;
  mdContent += `Status: ${report.status.toUpperCase()}\n\n`;

  mdContent += `## Summary\n\n`;
  mdContent += `- Documents Checked: ${report.totals.documents_checked}\n`;
  mdContent += `- Evidence IDs Found: ${report.totals.evidence_ids_found}\n`;
  mdContent += `- Evidence IDs Referenced: ${report.totals.evidence_ids_referenced}\n`;
  mdContent += `- Evidence IDs Registered: ${report.totals.evidence_ids_registered}\n`;
  mdContent += `- Evidence IDs Orphaned: ${report.totals.evidence_ids_orphaned}\n`;
  mdContent += `- Violations: ${report.totals.violations}\n`;
  mdContent += `- Errors: ${report.totals.errors}\n`;
  mdContent += `- Warnings: ${report.totals.warnings}\n`;
  mdContent += `- Info Messages: ${report.totals.infos}\n\n`;

  if (report.results.some(r => r.violations.length > 0)) {
    mdContent += `## Issues\n\n`;
    for (const result of report.results) {
      if (result.violations.length > 0) {
        const hasErrors = result.violations.some(v => v.severity === 'error');
        const hasWarnings = result.violations.some(v => v.severity === 'warning');
        const hasInfos = result.violations.some(v => v.severity === 'info');

        mdContent += `- **${result.path}** `;
        if (hasErrors) mdContent += `🚨(${result.violations.filter(v => v.severity === 'error').length} errors) `;
        if (hasWarnings) mdContent += `⚠️(${result.violations.filter(v => v.severity === 'warning').length} warnings) `;
        if (hasInfos) mdContent += `ℹ️(${result.violations.filter(v => v.severity === 'info').length} info) `;
        mdContent += `\n`;

        for (const violation of result.violations) {
          let icon = '';
          if (violation.severity === 'error') icon = '🚨 ';
          else if (violation.severity === 'warning') icon = '⚠️ ';
          else if (violation.severity === 'info') icon = 'ℹ️ ';

          mdContent += `  - ${icon}${violation.type}: ${violation.message}\n`;
        }
      }
    }
    mdContent += `\n`;
  }

  // Display orphaned IDs separately if any
  if (report.metadata.orphaned_ids && report.metadata.orphaned_ids.length > 0) {
    mdContent += `## Orphaned Evidence IDs\n\n`;
    mdContent += `The following evidence IDs exist in the registry but are not referenced by any governance document:\n\n`;
    for (const id of report.metadata.orphaned_ids) {
      mdContent += `- \`${id}\`\n`;
    }
    mdContent += `\n💡 Consider removing unused evidence IDs from the registry or referencing them in appropriate documents.\n\n`;
  }

  if (!report.results.some(r => r.violations.length > 0) &&
      (!report.metadata.orphaned_ids || report.metadata.orphaned_ids.length === 0)) {
    mdContent += `✅ No issues detected!\n`;
  }

  await writeFileAtomic(mdPath, normalizeOutput(mdContent));

  // Write stamp file for tracking with performance metrics
  const stamp = {
    sha: report.sha,
    status: report.status,
    timestamp: new Date().toISOString(),  // Runtime timestamp goes in stamp, not report
    generator: report.generator,
    violations: report.totals.violations
  };

  // Use canonical serialization for stamp.json too, but allow timestamps since it's runtime metadata
  const canonicalStamp = canonicalJsonStringify(stamp);
  await writeFileAtomic(stampPath, normalizeOutput(canonicalStamp));
}

/**
 * Main execution function
 */
async function main() {
  const startTime = Date.now();
  try {
    // Configuration - implement deterministic evidence map path resolution
    const args = process.argv.slice(2);
    const config = {
      governanceDir: 'docs/governance',
      outputDir: 'artifacts/governance/evidence-id-consistency',
      repoRoot: resolve('.')
    };

    // Deterministic evidence map path resolution following priority order:
    // 1. Explicit command line override (if provided)
    // 2. evidence/map.yml (main location)
    // 3. docs/ga/evidence_map.yml (canonical location if it exists)
    // 4. Hard error if neither exists
    let evidenceMapPath = args.find(arg => arg.startsWith('--evidence-map-path='))?.split('=')[1];
    if (!evidenceMapPath) {
      const fallbackPath = 'evidence/map.yml';
      const gaPath = 'docs/ga/evidence_map.yml';
      const fallbackExists = existsSync(join(resolve('.'), fallbackPath));
      const gaExists = existsSync(join(resolve('.'), gaPath));

      if (fallbackExists) {
        evidenceMapPath = fallbackPath;
        debugLog(`Using evidence map at: ${evidenceMapPath}`);
      } else if (gaExists) {
        evidenceMapPath = gaPath;
        debugLog(`Using canonical evidence map at: ${evidenceMapPath}`);
      } else {
        throw new Error(`Neither evidence map (${fallbackPath}) nor canonical evidence map (${gaPath}) exists. At least one must be provided.`);
      }
    }
    config.evidenceMapPath = evidenceMapPath;

    validateConfig(config);

    // Allow command line override
    let sha = args.find(arg => arg.startsWith('--sha='))?.split('=')[1];
    if (!sha) {
      sha = process.env.GITHUB_SHA || 'manual-' + Date.now().toString(36);
    }
    // Ensure SHA is properly formatted (no special chars that could create unsafe paths)
    sha = sha.replace(/[^a-zA-Z0-9_-]/g, '_');

    const outputOverride = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
    if (outputOverride) {
      config.outputDir = resolve(outputOverride);
    }

    console.log(`[${new Date().toISOString()}] Starting Evidence ID Consistency Verification...`);

    // Load evidence map
    const evidenceMapStartTime = Date.now();
    const evidenceMap = await loadEvidenceMap(config.evidenceMapPath);
    const evidenceMapDuration = Date.now() - evidenceMapStartTime;
    console.log(`Loaded evidence map with ${evidenceMap.size} entries (took ${evidenceMapDuration}ms)`);

    // Find governance documents
    const findDocsStartTime = Date.now();
    const documents = await findGovernanceDocuments(resolve(config.repoRoot));
    const findDocsDuration = Date.now() - findDocsStartTime;
    console.log(`Found ${documents.length} governance documents (took ${findDocsDuration}ms)`);

    // Process documents with concurrency control and progress indication
    console.log(`Processing ${documents.length} documents with batch size ${MAX_CONCURRENT_FILES}...`);
    const processStartTime = Date.now();
    const results = [];

    // Choose the appropriate processing function based on AI integration setting
    const processorFn = process.env.ENABLE_QWEN_ANALYSIS === 'true'
      ? processGovernanceDocumentWithAI
      : processGovernanceDocument;

    // Create a closure with the artifact directory for the AI processor
    const createProcessor = (artifactDir) => {
      return process.env.ENABLE_QWEN_ANALYSIS === 'true'
        ? (docPath, evidenceMap, repoRoot) => processGovernanceDocumentWithAI(docPath, evidenceMap, repoRoot, artifactDir)
        : processGovernanceDocument;
    };
    const processor = createProcessor(join(config.outputDir, sha));

    for (let i = 0; i < documents.length; i += MAX_CONCURRENT_FILES) {
      const batch = documents.slice(i, i + MAX_CONCURRENT_FILES);
      const batchResults = await Promise.all(
        batch.map(docPath => processor(docPath, evidenceMap, config.repoRoot))
      );
      results.push(...batchResults);

      // Progress indication for large repos
      if (documents.length > 50) {
        const processed = Math.min(i + MAX_CONCURRENT_FILES, documents.length);
        const percentage = Math.round((processed / documents.length) * 100);
        console.log(`Progress: ${processed}/${documents.length} documents processed (${percentage}%)`);
      }
    }
    const processDuration = Date.now() - processStartTime;

    // Generate policy hash for consistency tracking - based only on static policy, not runtime values
    const hashStartTime = Date.now();
    const policyConfig = {
      evidence_map_size: evidenceMap.size,
      evidence_map_entries: Array.from(evidenceMap.entries()).sort((a, b) =>
        compareStringsCodepoint(a[0], b[0])
      ),
      config_governance_dir: config.governanceDir,
      max_evidence_ids_per_doc: MAX_EVIDENCE_IDS_PER_DOC,
      max_file_size_bytes: MAX_FILE_SIZE_BYTES,
      max_concurrent_files: MAX_CONCURRENT_FILES
    };
    const policyHash = generateDeterministicHash(policyConfig);
    const hashDuration = Date.now() - hashStartTime;

    // Build report
    const buildReportStartTime = Date.now();
    // Create a deterministic config for the report (excludes runtime-specific values)
    const deterministicConfig = {
      governanceDir: config.governanceDir,
      evidenceMapPath: config.evidenceMapPath,
      outputDir: 'artifacts/governance/evidence-id-consistency', // Use canonical output path
      repoRoot: '.'  // Use relative root to avoid absolute paths
    };

    const report = buildConsistencyReport({
      sha,
      policyHash,
      results,
      config: deterministicConfig,
      evidenceMap
    });
    const buildReportDuration = Date.now() - buildReportStartTime;

    // Generate output paths based on SHA for actual writing
    const outputDir = join(config.outputDir, sha);

    // Write reports
    const writeReportsStartTime = Date.now();
    await writeReports(report, outputDir);
    const writeReportsDuration = Date.now() - writeReportsStartTime;

    // Calculate total time for performance metrics (after all major operations complete)
    const totalTime = Date.now() - startTime;

    // Generate deterministic metrics for monitoring/observability (no runtime timestamps or performance data)
    const metrics = {
      sha: report.sha,
      generator: report.generator,
      gate_version: '1.3.1',  // Updated version
      totals: {
        documents_checked: report.totals.documents_checked,
        evidence_ids_found: report.totals.evidence_ids_found,
        evidence_ids_referenced: report.totals.evidence_ids_referenced,
        evidence_ids_registered: report.totals.evidence_ids_registered,
        evidence_ids_orphaned: report.totals.evidence_ids_orphaned,
        violations: report.totals.violations,
        errors: report.totals.errors,
        warnings: report.totals.warnings,
        info_messages: report.totals.infos
      },
      accuracy: {
        document_processing_success_rate: documents.length > 0
          ? (documents.length - results.filter(r =>
              r.violations.some(v => v.type === 'processing_error')
            ).length) / documents.length
          : 1
      },
      configuration: {
        ai_analysis_enabled: process.env.ENABLE_QWEN_ANALYSIS === 'true',
        ai_patches_enabled: process.env.ENABLE_QWEN_PATCHES === 'true',
        replay_only_mode: process.env.QWEN_REPLAY_ONLY === 'true',
        record_mode_allowed: process.env.ALLOW_QWEN_RECORD_IN_CI === 'true',
        debug_enabled: DEBUG
      }
    };

    // Write deterministic metrics with canonical serialization
    const metricsPath = join(outputDir, 'metrics.json');
    const canonicalMetrics = canonicalJsonStringify(metrics);
    await fs.writeFile(metricsPath, canonicalMetrics, 'utf8');

    // Create runtime stamp with performance metrics and timestamps
    const stamp = {
      sha: report.sha,
      status: report.status,
      timestamp: new Date().toISOString(),  // Runtime timestamp goes in stamp, not metrics
      generator: report.generator,
      violations: report.totals.violations,
      performance: {
        total_time_ms: totalTime,
        evidence_map_load_ms: evidenceMapDuration,
        document_discovery_ms: findDocsDuration,
        document_processing_ms: processDuration,
        report_building_ms: buildReportDuration,
        report_writing_ms: writeReportsDuration,
        average_doc_processing_ms: documents.length > 0 ? Math.round(processDuration / documents.length) : 0
      }
    };

    const stampPath = join(outputDir, 'stamp.json');
    // Use canonical serialization for stamp.json too, but allow timestamps since it's runtime metadata
    const canonicalStamp = canonicalJsonStringify(stamp);
    await fs.writeFile(stampPath, canonicalStamp, 'utf8');


    console.log(`\nEvidence ID Consistency Report:`);
    console.log(`- Status: ${report.status.toUpperCase()}`);
    console.log(`- Documents: ${report.totals.documents_checked}`);
    console.log(`- Violations: ${report.totals.violations}`);
    console.log(`- Output: ${outputDir}`);
    console.log(`\nPerformance Metrics:`);
    console.log(`- Total time: ${totalTime}ms`);
    console.log(`- Evidence map load: ${evidenceMapDuration}ms`);
    console.log(`- Document discovery: ${findDocsDuration}ms`);
    console.log(`- Document processing: ${processDuration}ms`);
    console.log(`- Report building: ${buildReportDuration}ms`);
    console.log(`- Report writing: ${writeReportsDuration}ms`);
    console.log(`- Average per document: ${Math.round(processDuration / documents.length)}ms`);

    // Log metrics summary for operators
    if (report.totals.errors > 0 || report.totals.warnings > 0) {
      console.log(`\nQuality Metrics:`);
      console.log(`- Errors: ${report.totals.errors}`);
      console.log(`- Warnings: ${report.totals.warnings}`);
      console.log(`- Orphaned IDs: ${report.totals.evidence_ids_orphaned}`);
      console.log(`- Processing success rate: ${(metrics.accuracy.document_processing_success_rate * 100).toFixed(1)}%`);
    }

    // Exit with appropriate code
    const hasErrors = report.totals.errors > 0;
    if (hasErrors) {
      console.log('\n❌ Evidence ID consistency check FAILED');
      const shouldFailOnHighPatches = (
        process.env.QWEN_PATCHES_FAIL_ON_HIGH === 'true' &&
        report.metadata?.high_severity_patches > 0 &&
        report.metadata.high_severity_patches > parseInt(process.env.QWEN_PATCHES_MAX_HIGH || '0', 10)
      );
      if (shouldFailOnHighPatches) {
        console.log(`🚫 High severity patches threshold exceeded (${report.metadata?.high_severity_patches} > ${process.env.QWEN_PATCHES_MAX_HIGH}), exiting with error`);
        process.exit(1);
      }
      process.exit(1);
    } else {
      const hasWarnings = report.totals.warnings > 0;
      if (hasWarnings) {
        console.log('\n⚠️  Evidence ID check PASSED with warnings');
      } else {
        console.log('\n✅ Evidence ID consistency check PASSED');
      }
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error during evidence ID consistency check:', error.message);
    if (DEBUG) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === __filename) {
  main().catch(error => {
    console.error('Uncaught exception:', error);
    process.exit(1);
  });
}

/**
 * Process a single governance document with optional AI-assisted analysis and caching
 */
async function processGovernanceDocumentWithAI(filePath, evidenceMap, repoRoot, artifactDir = './artifacts') {
  // First run the standard processing
  const result = await processGovernanceDocument(filePath, evidenceMap, repoRoot);

  // If Qwen integration is enabled, run additional AI analysis
  if (process.env.ENABLE_QWEN_ANALYSIS === "true") {
    try {
      // Import dynamically since this feature may not always be enabled
      const qwenModule = await import("./ai-providers/qwen.mjs");
      const analyzeDocumentWithQwen = qwenModule.analyzeDocumentWithQwen || qwenModule.default;

      const content = await fs.readFile(filePath, "utf8");

      // Generate hash of the document content for cache key
      const contentHash = createHash('sha256').update(content).digest('hex');

      // Create AI analysis request parameters
      const analysisParams = {
        temperature: 0, // Deterministic setting
        response_format: { type: "json_object" }
      };

      // Call AI with caching for deterministic behavior
      const aiAnalysisResult = await analyzeDocumentWithQwen(
        content,
        "Validate Evidence-IDs compliance and mapping consistency",
        analysisParams,
        contentHash,
        artifactDir
      );

      // Extract AI insights if response contains them
      if (aiAnalysisResult && aiAnalysisResult.choices && aiAnalysisResult.choices[0]?.message?.content) {
        try {
          const aiInsights = JSON.parse(aiAnalysisResult.choices[0].message.content);
          // Convert AI insights to our violation format
          if (aiInsights.issues && Array.isArray(aiInsights.issues)) {
            for (const issue of aiInsights.issues) {
              result.violations.push({
                type: `ai_${issue.type || "analysis"}`,
                message: issue.message || "AI analysis identified potential issue",
                severity: issue.severity || "info",
                details: { ai_analysis: issue }
              });
            }
          }
        } catch (parseError) {
          // If unable to parse AI response, add as info message
          result.violations.push({
            type: "ai_analysis_unparsed",
            message: "AI analysis completed but response format not recognized",
            severity: "info",
            details: {
              error: parseError.message,
              raw_response: aiAnalysisResult?.choices[0]?.message?.content || 'Unknown'
            }
          });
        }
      }
    } catch (aiError) {
      // If AI analysis fails, don't break the main functionality
      debugLog(`AI analysis failed for ${filePath}: ${aiError.message}`);
      result.violations.push({
        type: "ai_processing_error",
        message: `AI analysis failed: ${aiError.message}`,
        severity: "info", // Don't fail the whole check for AI errors
        details: { error: aiError.message, stack: aiError.stack }
      });
    }
  }

  return result;
}

export {
  buildConsistencyReport,
  findGovernanceDocuments,
  generateDeterministicHash,
  loadEvidenceMap,
  parseEvidenceIds,
  parseHeaders,
  processGovernanceDocument,
  processGovernanceDocumentWithAI,
  removeBOM,
  validateFilePathSafety,
  writeReports
};
