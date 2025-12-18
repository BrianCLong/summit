import { createHash } from 'crypto';
import { ContractSpec, ValidationFinding } from './types.js';

export class ContractSpecification {
  constructor(private readonly spec: ContractSpec) {}

  get value(): ContractSpec {
    return this.spec;
  }

  validate(): ValidationFinding[] {
    const findings: ValidationFinding[] = [];

    if (!this.spec.fields.length) {
      findings.push({
        field: '*',
        issue: 'contract must define at least one field',
        severity: 'error'
      });
    }

    for (const field of this.spec.fields) {
      if (!field.name) {
        findings.push({ field: '*', issue: 'field name missing', severity: 'error' });
      }

      if (field.nullable === undefined) {
        findings.push({ field: field.name, issue: 'nullability unspecified', severity: 'warning' });
      }

      if (!field.description) {
        findings.push({ field: field.name, issue: 'description missing', severity: 'warning' });
      }

      if ((field.classification === 'dp' || field.classification === 'pii') && !field.nullable) {
        findings.push({
          field: field.name,
          issue: 'sensitive fields must be nullable to support redaction',
          severity: 'warning'
        });
      }
    }

    if (!this.spec.license?.name) {
      findings.push({ field: 'license', issue: 'license missing', severity: 'error' });
    }

    return findings;
  }

  hashTerms(): string {
    const hash = createHash('sha256');
    hash.update(`${this.spec.dataset}:${this.spec.version}:${JSON.stringify(this.spec.fields)}`);
    return hash.digest('hex');
  }
}
