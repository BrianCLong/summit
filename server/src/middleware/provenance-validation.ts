/**
 * Request Validation Middleware for Provenance Ledger Beta
 * Validates input data for provenance API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidHash(str: string): boolean {
  // SHA-256 hash: 64 hex characters
  const hashRegex = /^[a-f0-9]{64}$/i;
  return hashRegex.test(str);
}

function isValidLicenseType(type: string): boolean {
  return ['public', 'internal', 'restricted', 'classified'].includes(type);
}

function isValidSourceType(type: string): boolean {
  return ['document', 'database', 'api', 'user_input', 'sensor'].includes(type);
}

function isValidTransformType(type: string): boolean {
  return [
    'extract',
    'ocr',
    'translate',
    'normalize',
    'enrich',
    'extract_claim',
    'deduplicate',
    'classify',
    'redact',
  ].includes(type);
}

function isValidEvidenceType(type: string): boolean {
  return [
    'document',
    'image',
    'video',
    'log',
    'testimony',
    'sensor_data',
    'database_record',
  ].includes(type);
}

function isValidClaimType(type: string): boolean {
  return ['factual', 'inferential', 'predictive', 'evaluative'].includes(type);
}

function isValidConfidence(value: number): boolean {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate license creation input
 */
export function validateLicenseInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { license_type, restrictions, attribution_required } = req.body;

  const errors: string[] = [];

  if (!license_type || !isValidLicenseType(license_type)) {
    errors.push('Invalid license_type. Must be: public, internal, restricted, or classified');
  }

  if (restrictions && !Array.isArray(restrictions)) {
    errors.push('restrictions must be an array');
  }

  if (attribution_required !== undefined && typeof attribution_required !== 'boolean') {
    errors.push('attribution_required must be a boolean');
  }

  if (errors.length > 0) {
    logger.warn({
      message: 'License validation failed',
      errors,
      body: req.body,
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}

/**
 * Validate source registration input
 */
export function validateSourceInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { source_hash, source_type, license_id, created_by } = req.body;

  const errors: string[] = [];

  if (!source_hash || !isValidHash(source_hash)) {
    errors.push('source_hash must be a valid SHA-256 hash (64 hex characters)');
  }

  if (!source_type || !isValidSourceType(source_type)) {
    errors.push('Invalid source_type');
  }

  if (!license_id) {
    errors.push('license_id is required');
  }

  if (!created_by) {
    errors.push('created_by is required');
  }

  if (errors.length > 0) {
    logger.warn({
      message: 'Source validation failed',
      errors,
      body: req.body,
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}

/**
 * Validate transform registration input
 */
export function validateTransformInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const {
    transform_type,
    input_hash,
    output_hash,
    algorithm,
    version,
    duration_ms,
    executed_by,
    confidence,
  } = req.body;

  const errors: string[] = [];

  if (!transform_type || !isValidTransformType(transform_type)) {
    errors.push('Invalid transform_type');
  }

  if (!input_hash || !isValidHash(input_hash)) {
    errors.push('input_hash must be a valid SHA-256 hash');
  }

  if (!output_hash || !isValidHash(output_hash)) {
    errors.push('output_hash must be a valid SHA-256 hash');
  }

  if (!algorithm) {
    errors.push('algorithm is required');
  }

  if (!version) {
    errors.push('version is required');
  }

  if (duration_ms === undefined || typeof duration_ms !== 'number' || duration_ms < 0) {
    errors.push('duration_ms must be a non-negative number');
  }

  if (!executed_by) {
    errors.push('executed_by is required');
  }

  if (confidence !== undefined && !isValidConfidence(confidence)) {
    errors.push('confidence must be a number between 0 and 1');
  }

  if (errors.length > 0) {
    logger.warn({
      message: 'Transform validation failed',
      errors,
      body: req.body,
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}

/**
 * Validate evidence registration input
 */
export function validateEvidenceInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const {
    evidence_hash,
    evidence_type,
    storage_uri,
    source_id,
    transform_chain,
    license_id,
    registered_by,
  } = req.body;

  const errors: string[] = [];

  if (!evidence_hash || !isValidHash(evidence_hash)) {
    errors.push('evidence_hash must be a valid SHA-256 hash');
  }

  if (!evidence_type || !isValidEvidenceType(evidence_type)) {
    errors.push('Invalid evidence_type');
  }

  if (!storage_uri) {
    errors.push('storage_uri is required');
  }

  if (!source_id) {
    errors.push('source_id is required');
  }

  if (!transform_chain || !Array.isArray(transform_chain)) {
    errors.push('transform_chain must be an array');
  }

  if (!license_id) {
    errors.push('license_id is required');
  }

  if (!registered_by) {
    errors.push('registered_by is required');
  }

  if (errors.length > 0) {
    logger.warn({
      message: 'Evidence validation failed',
      errors,
      body: req.body,
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}

/**
 * Validate claim registration input
 */
export function validateClaimInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const {
    content,
    claim_type,
    confidence,
    evidence_ids,
    source_id,
    transform_chain,
    created_by,
    license_id,
  } = req.body;

  const errors: string[] = [];

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    errors.push('content is required and must be a non-empty string');
  }

  if (!claim_type || !isValidClaimType(claim_type)) {
    errors.push('Invalid claim_type');
  }

  if (confidence === undefined || !isValidConfidence(confidence)) {
    errors.push('confidence must be a number between 0 and 1');
  }

  if (!evidence_ids || !Array.isArray(evidence_ids)) {
    errors.push('evidence_ids must be an array');
  }

  if (!source_id) {
    errors.push('source_id is required');
  }

  if (!transform_chain || !Array.isArray(transform_chain)) {
    errors.push('transform_chain must be an array');
  }

  if (!created_by) {
    errors.push('created_by is required');
  }

  if (!license_id) {
    errors.push('license_id is required');
  }

  if (errors.length > 0) {
    logger.warn({
      message: 'Claim validation failed',
      errors,
      body: req.body,
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}

/**
 * Validate document ingestion input
 */
export function validateIngestInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { documentContent, userId, licenseId } = req.body;

  const errors: string[] = [];

  if (!documentContent || typeof documentContent !== 'string') {
    errors.push('documentContent is required and must be a string');
  }

  if (!userId) {
    errors.push('userId is required');
  }

  if (!licenseId) {
    errors.push('licenseId is required');
  }

  if (errors.length > 0) {
    logger.warn({
      message: 'Ingest validation failed',
      errors,
      body: { ...req.body, documentContent: '<redacted>' },
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}

/**
 * Validate export manifest creation input
 */
export function validateExportInput(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const {
    investigation_id,
    claim_ids,
    export_type,
    classification_level,
    created_by,
  } = req.body;

  const errors: string[] = [];

  if (!investigation_id && (!claim_ids || claim_ids.length === 0)) {
    errors.push('Either investigation_id or claim_ids must be provided');
  }

  if (claim_ids && !Array.isArray(claim_ids)) {
    errors.push('claim_ids must be an array');
  }

  if (!export_type) {
    errors.push('export_type is required');
  }

  if (!classification_level) {
    errors.push('classification_level is required');
  }

  if (!created_by) {
    errors.push('created_by is required');
  }

  if (errors.length > 0) {
    logger.warn({
      message: 'Export validation failed',
      errors,
      body: req.body,
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}

export default {
  validateLicenseInput,
  validateSourceInput,
  validateTransformInput,
  validateEvidenceInput,
  validateClaimInput,
  validateIngestInput,
  validateExportInput,
};
