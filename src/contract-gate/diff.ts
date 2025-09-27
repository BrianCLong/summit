import type { ContractDiff, DataContract, NormalizedField } from './types';
import { normalizeFields } from './schema/normalize';

function indexFields(fields: NormalizedField[]): Map<string, NormalizedField> {
  return new Map(fields.map((field) => [field.name, field]));
}

function compareSla(base?: DataContract['serviceLevel'], target?: DataContract['serviceLevel']): ContractDiff[] {
  if (!base || !target) {
    return [];
  }
  const diffs: ContractDiff[] = [];
  if (
    typeof base.freshnessMinutes === 'number' &&
    typeof target.freshnessMinutes === 'number' &&
    target.freshnessMinutes > base.freshnessMinutes
  ) {
    diffs.push({
      severity: 'breaking',
      category: 'sla',
      message: `Freshness SLA regressed from ${base.freshnessMinutes} to ${target.freshnessMinutes} minutes`,
      remediation: 'Re-align freshness objectives or revert the SLA relaxation.',
    });
  }
  if (
    typeof base.availabilityPercent === 'number' &&
    typeof target.availabilityPercent === 'number' &&
    target.availabilityPercent < base.availabilityPercent
  ) {
    diffs.push({
      severity: 'breaking',
      category: 'sla',
      message: `Availability dropped from ${base.availabilityPercent}% to ${target.availabilityPercent}%`,
      remediation: 'Restore the previous availability target or add consumer sign-offs.',
    });
  }
  if (
    typeof base.qualityScoreThreshold === 'number' &&
    typeof target.qualityScoreThreshold === 'number' &&
    target.qualityScoreThreshold < base.qualityScoreThreshold
  ) {
    diffs.push({
      severity: 'breaking',
      category: 'sla',
      message: `Quality score threshold reduced from ${base.qualityScoreThreshold} to ${target.qualityScoreThreshold}`,
      remediation: 'Maintain or exceed the agreed upon quality score threshold.',
    });
  }
  return diffs;
}

function compareSemantics(base?: DataContract['semantics'], target?: DataContract['semantics']): ContractDiff[] {
  if (!base || !target) {
    return [];
  }
  const diffs: ContractDiff[] = [];
  const baseFields = base.fields ?? {};
  const targetFields = target.fields ?? {};
  for (const [field, baseSemantics] of Object.entries(baseFields)) {
    const next = targetFields[field];
    if (!next) {
      diffs.push({
        field,
        severity: 'breaking',
        category: 'semantics',
        message: `Semantic definition for field \"${field}\" was removed`,
        remediation: 'Restore the semantic contract or provide a migration note for consumers.',
      });
      continue;
    }
    if (baseSemantics.description && next.description && baseSemantics.description !== next.description) {
      diffs.push({
        field,
        severity: 'non-breaking',
        category: 'semantics',
        message: `Semantic description for field \"${field}\" changed`,
        remediation: 'Communicate the updated business meaning in release notes.',
      });
    }
    if (baseSemantics.required && !next.required) {
      diffs.push({
        field,
        severity: 'info',
        category: 'semantics',
        message: `Field \"${field}\" is no longer marked as required in semantics`,
        remediation: 'Ensure downstream documentation highlights new optionality.',
      });
    }
    if (baseSemantics.enums && next.enums) {
      const missing = baseSemantics.enums.filter((value) => !next.enums?.includes(value));
      if (missing.length > 0) {
        diffs.push({
          field,
          severity: 'breaking',
          category: 'semantics',
          message: `Allowed values removed for field \"${field}\": ${missing.join(', ')}`,
          remediation: 'Keep the existing enumerations or provide a dual-publish deprecation path.',
        });
      }
    }
  }
  return diffs;
}

export function diffContracts(base: DataContract, target: DataContract): ContractDiff[] {
  const baseFields = normalizeFields(base);
  const targetFields = normalizeFields(target);
  const baseIndex = indexFields(baseFields);
  const targetIndex = indexFields(targetFields);

  const diffs: ContractDiff[] = [];

  for (const field of baseFields) {
    const targetField = targetIndex.get(field.name);
    if (!targetField) {
      diffs.push({
        field: field.name,
        severity: 'breaking',
        category: 'schema',
        message: `Field \"${field.name}\" was removed`,
        remediation: 'Restore the field or ship a compatibility shim for consumers.',
      });
      continue;
    }
    if (targetField.type !== field.type) {
      diffs.push({
        field: field.name,
        severity: 'breaking',
        category: 'schema',
        message: `Field \"${field.name}\" changed type from ${field.type} to ${targetField.type}`,
        remediation: 'Introduce new fields for type changes and deprecate the old ones gradually.',
      });
    }
    if (!field.optional && targetField.optional && targetField.type === field.type) {
      diffs.push({
        field: field.name,
        severity: 'non-breaking',
        category: 'schema',
        message: `Field \"${field.name}\" relaxed from required to optional`,
        remediation: 'Update validation logic to treat the field as optional going forward.',
      });
    }
  }

  for (const field of targetFields) {
    if (!baseIndex.has(field.name)) {
      if (field.optional) {
        diffs.push({
          field: field.name,
          severity: 'non-breaking',
          category: 'schema',
          message: `Optional field \"${field.name}\" added`,
          remediation: 'Communicate availability to consumers so they can opt-in.',
        });
      } else {
        diffs.push({
          field: field.name,
          severity: 'breaking',
          category: 'schema',
          message: `Required field \"${field.name}\" added`,
          remediation: 'Provide a default value or mark the field optional for backward compatibility.',
        });
      }
    }
  }

  diffs.push(...compareSemantics(base.semantics, target.semantics));
  diffs.push(...compareSla(base.serviceLevel, target.serviceLevel));

  return diffs;
}

export function hasBreakingChanges(diffs: ContractDiff[]): boolean {
  return diffs.some((diff) => diff.severity === 'breaking');
}
