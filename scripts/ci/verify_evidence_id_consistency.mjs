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
    if (!existsSync(mapPath)) {
      console.warn(`Evidence map not found at ${mapPath}, proceeding with empty map`);
      return new Map();
    }

    const content = await fs.readFile(mapPath, 'utf8');
    const cleanedContent = removeBOM(content);
    const parsed = yaml.load(cleanedContent) || {};
    
    // Convert to Map for faster lookup
    return new Map(Object.entries(parsed));
  } catch (error) {
    console.error(`Failed to load evidence map ${mapPath}: ${error.message}`);
    throw new Error(`Evidence map loading failed: ${error.message}`);
  }
}

/**
 * Process a single governance document
 */
async function processGovernanceDocument(filePath, evidenceMap, repoRoot) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      return {
        path: relative(repoRoot, filePath),
        violations: [{
          type: 'file_size_exceeded',
          message: `File exceeds maximum size limit of ${MAX_FILE_SIZE_BYTES} bytes`,
          severity: 'error'
        }],
        evidence_ids: []
      };
    }

    const content = await fs.readFile(filePath, 'utf8');
    const cleanedContent = removeBOM(content);
    const headers = parseHeaders(cleanedContent);
    
    const evidenceRaw = headers['Evidence-IDs'] || headers['Evidence-Ids'] || headers['Evidence-ids'];
    const evidenceIds = parseEvidenceIds(evidenceRaw);
    
    // Validate evidence ID format and count
    const formatViolations = [];
    if (evidenceIds.length > MAX_EVIDENCE_IDS_PER_DOC) {
      formatViolations.push({
        type: 'too_many_evidence_ids',
        message: `Document contains ${evidenceIds.length} evidence IDs, exceeding limit of ${MAX_EVIDENCE_IDS_PER_DOC}`,
        severity: 'error'
      });
    }
    
    for (const [idx, id] of evidenceIds.entries()) {
      if (!isValidEvidenceIdFormat(id)) {
        formatViolations.push({
          type: 'invalid_evidence_id_format',
          message: `Evidence ID "${id}" at position ${idx} is not properly formatted`,
          evidence_id: id,
          severity: 'error'
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
          severity: 'warning' // Could be warning instead of error depending on policy
        });
      }
    }

    const allViolations = [...formatViolations, ...mappingViolations];
    
    return {
      path: relative(repoRoot, filePath),
      violations: allViolations,
      evidence_ids: evidenceIds
    };
  } catch (error) {
    return {
      path: relative(repoRoot, filePath),
      violations: [{
        type: 'processing_error',
        message: `Failed to process file: ${error.message}`,
        severity: 'error'
      }],
      evidence_ids: []
    };
  }
}

/**
 * Find all governance documents in the repository
 */
async function findGovernanceDocuments(rootDir, extension = '.md') {
  const documents = [];

  async function walkDirectory(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    // Process entries in sorted order for consistency
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = join(currentPath, entry.name);
      const relativePath = relative(rootDir, fullPath);

      if (entry.isDirectory()) {
        // Skip certain directories
        if (['node_modules', '.git', 'dist', 'build', 'target', '.svn'].includes(entry.name)) {
          continue;
        }
        await walkDirectory(fullPath);
      } else if (entry.isFile() && relativePath.endsWith(extension)) {
        // Check if it's in the governance directory
        if (relativePath.includes('governance') || relativePath.includes('/gov/')) {
          documents.push(fullPath);
        }
      }
    }
  }

  await walkDirectory(rootDir);
  return documents.sort(); // Sort for deterministic processing order
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
function buildConsistencyReport({ sha, policyHash, results, config }) {
  const normalizedResults = [...results]
    .map(result => ({
      path: result.path,
      violations: result.violations.sort((a, b) => 
        a.type.localeCompare(b.type) || a.message.localeCompare(b.message)
      ),
      evidence_ids: result.evidence_ids
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const allViolations = normalizedResults.flatMap(result => result.violations);
  const errors = allViolations.filter(v => v.severity === 'error');
  const warnings = allViolations.filter(v => v.severity === 'warning');

  const status = errors.length > 0 ? 'fail' : 'pass';

  return {
    version: '1.0.0',
    generator: 'evidence-id-consistency-verifier',
    status,
    sha,
    policy_hash: policyHash,
    generated_at: new Date().toISOString(),
    source: 'evidence-id-policy',
    config: config,
    totals: {
      documents_checked: normalizedResults.length,
      evidence_ids_found: normalizedResults.reduce((sum, r) => sum + r.evidence_ids.length, 0),
      violations: allViolations.length,
      errors: errors.length,
      warnings: warnings.length
    },
    results: normalizedResults,
    metadata: {
      summary: `Processed ${normalizedResults.length} documents, found ${errors.length} errors and ${warnings.length} warnings`,
      recommendations: errors.length > 0 
        ? ['Fix all violations before merging'] 
        : warnings.length > 0
          ? ['Address warnings for optimal governance health'] 
          : ['No issues detected']
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
  
  // Ensure output directory exists
  await fs.mkdir(outputPath, { recursive: true });
  
  // Write JSON report
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  
  // Write Markdown report
  let mdContent = `# Evidence ID Consistency Report\n\n`;
  mdContent += `Generated: ${report.generated_at}\n`;
  mdContent += `Status: ${report.status.toUpperCase()}\n\n`;
  
  mdContent += `## Summary\n\n`;
  mdContent += `- Documents Checked: ${report.totals.documents_checked}\n`;
  mdContent += `- Evidence IDs Found: ${report.totals.evidence_ids_found}\n`;
  mdContent += `- Violations: ${report.totals.violations}\n`;
  mdContent += `- Errors: ${report.totals.errors}\n`;
  mdContent += `- Warnings: ${report.totals.warnings}\n\n`;
  
  if (report.results.some(r => r.violations.length > 0)) {
    mdContent += `## Issues\n\n`;
    for (const result of report.results) {
      if (result.violations.length > 0) {
        mdContent += `- **${result.path}**:\n`;
        for (const violation of result.violations) {
          mdContent += `  - ${violation.type}: ${violation.message}\n`;
        }
      }
    }
  } else {
    mdContent += `✅ No issues detected!\n`;
  }
  
  await fs.writeFile(mdPath, mdContent, 'utf8');
  
  // Write stamp file for tracking
  const stamp = {
    sha: report.sha,
    status: report.status,
    timestamp: report.generated_at,
    generator: report.generator,
    violations: report.totals.violations
  };
  await fs.writeFile(stampPath, JSON.stringify(stamp, null, 2), 'utf8');
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Configuration
    const args = process.argv.slice(2);
    const config = {
      governanceDir: 'docs/governance',
      evidenceMapPath: 'evidence/map.yml', // default path
      outputDir: 'artifacts/governance/evidence-id-consistency',
      repoRoot: resolve('.')
    };

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

    console.log('Starting Evidence ID Consistency Verification...');
    
    // Load evidence map
    const evidenceMap = await loadEvidenceMap(config.evidenceMapPath);
    console.log(`Loaded evidence map with ${evidenceMap.size} entries`);

    // Find governance documents
    const documents = await findGovernanceDocuments(resolve(config.repoRoot));
    console.log(`Found ${documents.length} governance documents`);

    // Process documents with concurrency control
    const results = [];
    for (let i = 0; i < documents.length; i += MAX_CONCURRENT_FILES) {
      const batch = documents.slice(i, i + MAX_CONCURRENT_FILES);
      const batchResults = await Promise.all(
        batch.map(docPath => processGovernanceDocument(docPath, evidenceMap, config.repoRoot))
      );
      results.push(...batchResults);
    }

    // Generate policy hash for consistency tracking
    const policyHash = generateDeterministicHash({
      evidence_map_size: evidenceMap.size,
      document_count: documents.length
    });

    // Build report
    const report = buildConsistencyReport({
      sha,
      policyHash,
      results,
      config
    });

    // Generate output paths based on SHA
    const outputDir = join(config.outputDir, sha);
    
    // Write reports
    await writeReports(report, outputDir);
    
    // Log summary
    console.log(`\nEvidence ID Consistency Report:`);
    console.log(`- Status: ${report.status.toUpperCase()}`);
    console.log(`- Documents: ${report.totals.documents_checked}`);
    console.log(`- Violations: ${report.totals.violations}`);
    console.log(`- Output: ${outputDir}`);
    
    // Exit with appropriate code
    const hasErrors = report.totals.errors > 0;
    if (hasErrors) {
      console.log('\n❌ Evidence ID consistency check FAILED');
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

export {
  buildConsistencyReport,
  findGovernanceDocuments,
  generateDeterministicHash,
  loadEvidenceMap,
  parseEvidenceIds,
  parseHeaders,
  processGovernanceDocument,
  removeBOM,
  validateFilePathSafety,
  writeReports
};