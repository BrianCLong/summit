import {
  ConsistencyScope,
  DataFormat,
  FieldRule,
  GeneralizeAction,
  MaskAction,
  Policy,
  TransformAction,
  ValidationIssue,
  ValidationResult
} from './types.js';
import { RawPolicy, RawFieldRule, RawAction } from './parser.js';

const allowedFormats: DataFormat[] = ['string', 'ssn', 'iban', 'phone'];
const allowedScopes: ConsistencyScope[] = ['session', 'global'];

function isConsistencyScope(value: unknown): value is ConsistencyScope {
  return typeof value === 'string' && allowedScopes.includes(value as ConsistencyScope);
}

function isFormat(value: unknown): value is DataFormat {
  return typeof value === 'string' && allowedFormats.includes(value as DataFormat);
}

function defaultMaskChar(format: DataFormat): string {
  switch (format) {
    case 'iban':
      return 'X';
    case 'ssn':
    case 'phone':
      return '#';
    default:
      return '*';
  }
}

function normalizeMaskAction(
  action: RawAction,
  format: DataFormat,
  errors: ValidationIssue[],
  fieldPath: string
): MaskAction | undefined {
  const keepRaw = action.params.keep ?? action.params.visible ?? 0;
  const charRaw = action.params.char ?? action.params.character ?? defaultMaskChar(format);
  if (typeof keepRaw !== 'number' || keepRaw < 0) {
    errors.push({ field: fieldPath, message: 'mask keep parameter must be a non-negative number' });
    return undefined;
  }
  const charValue = typeof charRaw === 'string' ? charRaw : String(charRaw);
  if (charValue.length !== 1) {
    errors.push({ field: fieldPath, message: 'mask char parameter must be a single character' });
    return undefined;
  }
  if (format === 'iban' && !/[A-Z0-9]/.test(charValue)) {
    errors.push({ field: fieldPath, message: 'mask char for IBAN must be alphanumeric' });
    return undefined;
  }
  if ((format === 'ssn' || format === 'phone') && !/[0-9#]/.test(charValue)) {
    errors.push({ field: fieldPath, message: 'mask char for SSN/phone must be numeric or #' });
    return undefined;
  }
  return {
    type: 'mask',
    keep: keepRaw,
    char: charValue
  };
}

function normalizeHashAction(
  action: RawAction,
  policyScope: ConsistencyScope,
  errors: ValidationIssue[],
  fieldPath: string
): TransformAction | undefined {
  const algorithmRaw = (action.params.algorithm ?? action.params.algo ?? 'sha256') as string;
  if (algorithmRaw !== 'sha256' && algorithmRaw !== 'sha512') {
    errors.push({ field: fieldPath, message: 'hash algorithm must be sha256 or sha512' });
    return undefined;
  }
  const scopeValue = (action.params.scope ?? action.params.salt ?? policyScope) as string;
  if (!isConsistencyScope(scopeValue)) {
    errors.push({ field: fieldPath, message: 'hash scope must be session or global' });
    return undefined;
  }
  return {
    type: 'hash',
    algorithm: algorithmRaw,
    saltScope: scopeValue
  };
}

function normalizeTokenizeAction(
  action: RawAction,
  errors: ValidationIssue[],
  fieldPath: string
): TransformAction | undefined {
  const namespaceRaw = action.params.namespace ?? action.params.ns;
  if (typeof namespaceRaw !== 'string' || namespaceRaw.trim().length === 0) {
    errors.push({ field: fieldPath, message: 'tokenize namespace is required' });
    return undefined;
  }
  const preserve = action.params.preserveFormat;
  let preserveFormat = true;
  if (preserve !== undefined) {
    if (typeof preserve === 'boolean') {
      preserveFormat = preserve;
    } else if (typeof preserve === 'string') {
      preserveFormat = preserve.toLowerCase() === 'true';
    } else {
      preserveFormat = Boolean(preserve);
    }
  }
  return {
    type: 'tokenize',
    namespace: namespaceRaw,
    preserveFormat
  };
}

function normalizeGeneralizeAction(
  action: RawAction,
  errors: ValidationIssue[],
  fieldPath: string
): TransformAction | undefined {
  const granularityRaw = action.params.granularity ?? action.params.level;
  if (typeof granularityRaw !== 'string') {
    errors.push({ field: fieldPath, message: 'generalize granularity is required' });
    return undefined;
  }
  const allowed = ['country', 'region', 'state', 'city', 'none'];
  if (!allowed.includes(granularityRaw)) {
    errors.push({ field: fieldPath, message: `generalize granularity must be one of ${allowed.join(', ')}` });
    return undefined;
  }
  const normalized: GeneralizeAction = {
    type: 'generalize',
    granularity: granularityRaw as GeneralizeAction['granularity']
  };
  return normalized;
}

function normalizeField(
  raw: RawFieldRule,
  policyScope: ConsistencyScope,
  errors: ValidationIssue[],
  seen: Set<string>
): FieldRule | undefined {
  if (seen.has(raw.path)) {
    errors.push({ field: raw.path, message: 'duplicate field path in policy' });
    return undefined;
  }
  seen.add(raw.path);

  if (!isFormat(raw.format)) {
    errors.push({ field: raw.path, message: `unsupported format '${String(raw.format)}'` });
    return undefined;
  }

  const transforms: TransformAction[] = [];
  if (!raw.transforms.length) {
    errors.push({ field: raw.path, message: 'at least one transform is required' });
  }

  for (const transform of raw.transforms) {
    switch (transform.type) {
      case 'mask': {
        const normalized = normalizeMaskAction(transform, raw.format, errors, raw.path);
        if (normalized) transforms.push(normalized);
        break;
      }
      case 'hash': {
        const normalized = normalizeHashAction(transform, policyScope, errors, raw.path);
        if (normalized) transforms.push(normalized);
        break;
      }
      case 'tokenize': {
        const normalized = normalizeTokenizeAction(transform, errors, raw.path);
        if (normalized) transforms.push(normalized);
        break;
      }
      case 'generalize': {
        const normalized = normalizeGeneralizeAction(transform, errors, raw.path);
        if (normalized) transforms.push(normalized);
        break;
      }
      default: {
        errors.push({ field: raw.path, message: `unknown transform '${transform.type}'` });
      }
    }
  }

  if (!transforms.length) {
    return undefined;
  }

  const consistencyRaw = raw.consistency ?? policyScope;
  if (!isConsistencyScope(consistencyRaw)) {
    errors.push({ field: raw.path, message: 'consistency scope must be session or global' });
    return undefined;
  }

  return {
    path: raw.path,
    format: raw.format,
    transforms,
    consistency: consistencyRaw,
    explain: raw.explain
  };
}

export function validatePolicy(raw: RawPolicy): { result: ValidationResult; policy?: Policy } {
  const errors: ValidationIssue[] = [];

  if (!raw.name || raw.name.trim().length === 0) {
    errors.push({ message: 'policy name is required' });
  }

  const policyScopeRaw = raw.scope ?? 'session';
  if (!isConsistencyScope(policyScopeRaw)) {
    errors.push({ message: 'policy scope must be session or global' });
  }
  const policyScope: ConsistencyScope = isConsistencyScope(policyScopeRaw) ? policyScopeRaw : 'session';

  if (!Array.isArray(raw.fields) || raw.fields.length === 0) {
    errors.push({ message: 'policy must declare at least one field' });
  }

  const seen = new Set<string>();
  const fields: FieldRule[] = [];
  for (const field of raw.fields) {
    const normalized = normalizeField(field, policyScope, errors, seen);
    if (normalized) {
      fields.push(normalized);
    }
  }

  if (errors.length) {
    return { result: { valid: false, errors } };
  }

  const policy: Policy = {
    name: raw.name,
    scope: policyScope,
    fields
  };

  return { result: { valid: true, errors: [] }, policy };
}

export class ValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(issues.map((issue) => (issue.field ? `${issue.field}: ${issue.message}` : issue.message)).join('\n'));
  }
}

export function ensureValidPolicy(raw: RawPolicy): Policy {
  const { result, policy } = validatePolicy(raw);
  if (!result.valid || !policy) {
    throw new ValidationError(result.errors);
  }
  return policy;
}
