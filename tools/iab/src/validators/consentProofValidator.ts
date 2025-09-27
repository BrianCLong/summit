import { ArtifactConfig, ValidationResult } from '../types.js';

export function validateConsentProof(
  artifact: ArtifactConfig,
  rawContent: string
): ValidationResult {
  try {
    const parsed = JSON.parse(rawContent) as Record<string, unknown>;

    const requiredFields = ['subjectId', 'consentVersion', 'capturedAt', 'signature'];
    const missing = requiredFields.filter((field) => typeof parsed[field] !== 'string');

    if (missing.length > 0) {
      return {
        status: 'failed',
        validator: 'ConsentProofValidator',
        details: [`missing fields: ${missing.join(', ')}`]
      };
    }

    return {
      status: 'passed',
      validator: 'ConsentProofValidator',
      details: ['consent proof contains required attestations'],
      metadata: {
        subjectId: parsed.subjectId,
        consentVersion: parsed.consentVersion
      }
    };
  } catch (error) {
    return {
      status: 'failed',
      validator: 'ConsentProofValidator',
      details: [(error as Error).message]
    };
  }
}
