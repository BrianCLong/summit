/**
 * Data Envelope Export Functionality
 *
 * Exports data with full provenance, governance verdicts, and license compliance
 * Supports PDF, CSV, JSON, and Excel formats
 *
 * SOC 2 Controls: PI1.1, PI1.2, PI1.4, C1.2
 */

import {
  DataEnvelope,
  ExportBundle,
  ExportFormat,
  DataClassification,
} from '../types/data-envelope';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Export configuration
 */
export interface ExportConfig {
  /** Include provenance metadata */
  includeProvenance?: boolean;

  /** Include governance verdicts */
  includeGovernance?: boolean;

  /** Include lineage chain */
  includeLineage?: boolean;

  /** Output directory */
  outputDir?: string;

  /** Include digital signature */
  signExport?: boolean;
}

/**
 * Default export configuration
 */
const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  includeProvenance: true,
  includeGovernance: true,
  includeLineage: true,
  signExport: false,
};

/**
 * Export data bundle to file
 */
export async function exportDataBundle(
  bundle: ExportBundle,
  config: ExportConfig = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_EXPORT_CONFIG, ...config };

  switch (bundle.format) {
    case ExportFormat.JSON:
      return exportToJSON(bundle, finalConfig);
    case ExportFormat.CSV:
      return exportToCSV(bundle, finalConfig);
    case ExportFormat.PDF:
      return exportToPDF(bundle, finalConfig);
    case ExportFormat.EXCEL:
      return exportToExcel(bundle, finalConfig);
    default:
      throw new Error(`Unsupported export format: ${bundle.format}`);
  }
}

/**
 * Export to JSON format with full metadata
 */
async function exportToJSON(bundle: ExportBundle, config: ExportConfig): Promise<string> {
  const outputDir = config.outputDir || '/tmp/exports';
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `export-${bundle.exportId}.json`;
  const filepath = path.join(outputDir, filename);

  // Prepare export data
  const exportData = {
    exportId: bundle.exportId,
    exportedAt: bundle.generatedAt,
    format: bundle.format,
    provenance: config.includeProvenance ? bundle.provenance : undefined,
    licenses: bundle.licenses,
    licenseCheck: bundle.licenseCheck,
    merkleRoot: bundle.merkleRoot,
    itemCount: bundle.items.length,
    items: bundle.items.map((item) => ({
      data: item.data,
      provenance: config.includeProvenance ? item.provenance : undefined,
      lineage: config.includeLineage ? item.provenance.lineage : undefined,
      confidence: item.confidence,
      isSimulated: item.isSimulated,
      classification: item.classification,
      governanceVerdict: config.includeGovernance ? item.governanceVerdict : undefined,
      dataHash: item.dataHash,
      warnings: item.warnings,
    })),
  };

  await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf-8');

  return filepath;
}

/**
 * Export to CSV format with metadata headers
 */
async function exportToCSV(bundle: ExportBundle, config: ExportConfig): Promise<string> {
  const outputDir = config.outputDir || '/tmp/exports';
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `export-${bundle.exportId}.csv`;
  const filepath = path.join(outputDir, filename);

  // CSV Header
  let csv = '# Data Export with Provenance\n';
  csv += `# Export ID: ${bundle.exportId}\n`;
  csv += `# Generated: ${bundle.generatedAt.toISOString()}\n`;
  csv += `# Merkle Root: ${bundle.merkleRoot}\n`;
  csv += `# License Check: ${bundle.licenseCheck.valid ? 'PASSED' : 'FAILED'}\n`;

  if (bundle.licenses.length > 0) {
    csv += `# Licenses: ${bundle.licenses.join(', ')}\n`;
  }

  csv += '\n';

  // Data rows
  if (bundle.items.length > 0) {
    // Get all unique keys from first item
    const sampleData = bundle.items[0].data;
    const dataKeys = Object.keys(sampleData);

    // Add metadata columns
    const metadataColumns = ['_provenanceId', '_source', '_confidence', '_isSimulated', '_classification'];
    const allColumns = [...dataKeys, ...metadataColumns];

    // Header row
    csv += allColumns.join(',') + '\n';

    // Data rows
    for (const item of bundle.items) {
      const row: string[] = [];

      // Data columns
      for (const key of dataKeys) {
        const value = item.data[key];
        row.push(escapeCsvValue(value));
      }

      // Metadata columns
      row.push(escapeCsvValue(item.provenance.provenanceId));
      row.push(escapeCsvValue(item.provenance.source));
      row.push(escapeCsvValue(item.confidence));
      row.push(escapeCsvValue(item.isSimulated));
      row.push(escapeCsvValue(item.classification));

      csv += row.join(',') + '\n';
    }
  }

  // Provenance footer
  if (config.includeProvenance) {
    csv += '\n# Provenance Lineage\n';
    for (let i = 0; i < bundle.items.length; i++) {
      const item = bundle.items[i];
      csv += `# Item ${i + 1}: ${item.provenance.source}\n`;

      if (config.includeLineage && item.provenance.lineage.length > 0) {
        for (const node of item.provenance.lineage) {
          csv += `#   - ${node.operation} (${new Date(node.timestamp).toISOString()})\n`;
        }
      }
    }
  }

  await fs.writeFile(filepath, csv, 'utf-8');

  return filepath;
}

/**
 * Export to PDF format with provenance
 */
async function exportToPDF(bundle: ExportBundle, config: ExportConfig): Promise<string> {
  const outputDir = config.outputDir || '/tmp/exports';
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `export-${bundle.exportId}.pdf.json`;
  const filepath = path.join(outputDir, filename);

  // For now, export as structured JSON that can be converted to PDF
  // In production, use a PDF library like pdfkit or puppeteer
  const pdfData = {
    title: 'Data Export with Provenance',
    exportId: bundle.exportId,
    generatedAt: bundle.generatedAt.toISOString(),
    sections: [
      {
        title: 'Export Metadata',
        content: {
          exportId: bundle.exportId,
          format: bundle.format,
          itemCount: bundle.items.length,
          merkleRoot: bundle.merkleRoot,
          licenses: bundle.licenses,
          licenseCheckStatus: bundle.licenseCheck.valid ? 'PASSED' : 'FAILED',
          riskLevel: bundle.licenseCheck.riskAssessment.level,
        },
      },
      {
        title: 'License Compliance',
        content: {
          valid: bundle.licenseCheck.valid,
          policyAction: bundle.licenseCheck.policyDecision.action,
          reasons: bundle.licenseCheck.policyDecision.reasons,
          riskFactors: bundle.licenseCheck.riskAssessment.factors,
        },
      },
      {
        title: 'Data Items',
        items: bundle.items.map((item, index) => ({
          itemNumber: index + 1,
          data: item.data,
          metadata: {
            source: item.provenance.source,
            generatedAt: item.provenance.generatedAt,
            confidence: item.confidence,
            isSimulated: item.isSimulated,
            classification: item.classification,
            dataHash: item.dataHash,
          },
          lineage: config.includeLineage
            ? item.provenance.lineage.map((node) => ({
                operation: node.operation,
                timestamp: node.timestamp,
                actor: node.actor,
              }))
            : undefined,
          governance: config.includeGovernance ? item.governanceVerdict : undefined,
          warnings: item.warnings,
        })),
      },
    ],
  };

  await fs.writeFile(filepath, JSON.stringify(pdfData, null, 2), 'utf-8');

  return filepath;
}

/**
 * Export to Excel format
 */
async function exportToExcel(bundle: ExportBundle, config: ExportConfig): Promise<string> {
  // For now, use CSV format with .xlsx extension
  // In production, use a library like exceljs
  const csvPath = await exportToCSV(bundle, config);
  const xlsxPath = csvPath.replace('.csv', '.xlsx.csv');

  await fs.rename(csvPath, xlsxPath);

  return xlsxPath;
}

/**
 * Escape CSV value
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Create export manifest
 */
export async function createExportManifest(bundle: ExportBundle): Promise<string> {
  const manifest = {
    manifestVersion: '1.0',
    exportId: bundle.exportId,
    generatedAt: bundle.generatedAt.toISOString(),
    format: bundle.format,
    itemCount: bundle.items.length,
    merkleRoot: bundle.merkleRoot,
    licenses: bundle.licenses,
    licenseCheck: {
      valid: bundle.licenseCheck.valid,
      policyAction: bundle.licenseCheck.policyDecision.action,
      riskLevel: bundle.licenseCheck.riskAssessment.level,
    },
    provenance: {
      source: bundle.provenance.source,
      actor: bundle.provenance.actor,
      version: bundle.provenance.version,
      provenanceId: bundle.provenance.provenanceId,
    },
    items: bundle.items.map((item) => ({
      dataHash: item.dataHash,
      provenanceId: item.provenance.provenanceId,
      source: item.provenance.source,
      classification: item.classification,
      confidence: item.confidence,
      isSimulated: item.isSimulated,
      warnings: item.warnings,
    })),
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Verify export integrity
 */
export function verifyExportIntegrity(bundle: ExportBundle): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Verify merkle root
  const { createHash } = require('crypto');
  const hashes = bundle.items.map((item) => item.dataHash);

  let nodes = hashes.map((h) => Buffer.from(h, 'hex'));
  while (nodes.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 < nodes.length) {
        next.push(
          createHash('sha256')
            .update(Buffer.concat([nodes[i], nodes[i + 1]]))
            .digest()
        );
      } else {
        next.push(nodes[i]);
      }
    }
    nodes = next;
  }

  const computedRoot = nodes[0].toString('hex');
  if (computedRoot !== bundle.merkleRoot) {
    errors.push('Merkle root mismatch - export may have been tampered with');
  }

  // Verify each item
  for (let i = 0; i < bundle.items.length; i++) {
    const item = bundle.items[i];
    const dataString = JSON.stringify(item.data);
    const expectedHash = createHash('sha256').update(dataString).digest('hex');

    if (item.dataHash !== expectedHash) {
      errors.push(`Item ${i + 1} hash mismatch`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
