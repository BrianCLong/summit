import { FactRecord, ValidationIssue, ValidationResult } from './types.js';

export class InformationGate {
  static admit(fact: FactRecord, now: Date = new Date()): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!fact.id?.trim()) {
      issues.push({ field: 'id', message: 'Facts require stable identifiers.' });
    }

    if (!fact.source?.trim()) {
      issues.push({ field: 'source', message: 'Source is required for provenance.' });
    }

    if (!fact.attribution?.trim()) {
      issues.push({ field: 'attribution', message: 'Attribution must be present before use.' });
    }

    if (!fact.receivedAt) {
      issues.push({ field: 'receivedAt', message: 'Received timestamp is required for lifecycle decisions.' });
    } else if (Number.isNaN(fact.receivedAt.getTime())) {
      issues.push({ field: 'receivedAt', message: 'Received timestamp must be a valid date.' });
    } else if (fact.receivedAt.getTime() > now.getTime()) {
      issues.push({ field: 'receivedAt', message: 'Received timestamp cannot be in the future.' });
    }

    if (fact.expiresAt) {
      if (Number.isNaN(fact.expiresAt.getTime())) {
        issues.push({ field: 'expiresAt', message: 'Expiration timestamp must be a valid date.' });
      } else if (fact.expiresAt.getTime() <= now.getTime()) {
        issues.push({ field: 'expiresAt', message: 'Fact is expired and must be renewed before use.' });
      }
      if (fact.receivedAt && fact.expiresAt.getTime() <= fact.receivedAt.getTime()) {
        issues.push({
          field: 'expiresAt',
          message: 'Expiration timestamp must be after the received timestamp.',
        });
      }
    }

    if (fact.revoked) {
      issues.push({ field: 'revoked', message: 'Fact has been revoked and cannot be admitted.' });
    }

    return { ok: issues.length === 0, issues };
  }
}
