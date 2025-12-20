import Ajv, { type AnySchema, type ErrorObject, type ValidateFunction } from 'ajv';

const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
  strict: false
});

const schemaCache = new WeakMap<object, ValidateFunction>();

export type PiiType = 'email' | 'phone' | 'credit_card' | 'ssn';

const DEFAULT_PII_TYPES: readonly PiiType[] = ['email', 'phone', 'credit_card', 'ssn'];

const PII_PATTERNS: Record<PiiType, RegExp> = {
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  phone: /\+?\d[\d\s().-]{7,}\d/g,
  credit_card: /\b(?:\d[ -]?){13,16}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g
};

export interface RegexConstraint {
  pattern: string;
  flags?: string;
  description?: string;
}

export interface EnumConstraint {
  values: string[];
  caseSensitive?: boolean;
}

export interface PiiConstraint {
  types?: PiiType[];
  replacement?: string;
}

export interface LengthConstraint {
  min?: number;
  max?: number;
}

export interface RangeConstraint {
  min?: number;
  max?: number;
}

export interface LocaleConstraint {
  allowed: string[];
  canonicalize?: boolean;
  path?: string;
}

export interface OutputContract<TValue = unknown> {
  schema?: AnySchema;
  regex?: RegexConstraint;
  enum?: EnumConstraint;
  forbidsPII?: boolean | PiiConstraint;
  length?: LengthConstraint;
  range?: RangeConstraint;
  locale?: LocaleConstraint;
  customValidators?: Array<(value: TValue) => ValidationFailure | void>;
}

export interface ValidationFailure {
  code: string;
  message: string;
  path?: string;
  meta?: Record<string, unknown>;
}

export interface SanitizationAction {
  code: string;
  message: string;
}

export interface ValidationResult<TValue> {
  valid: boolean;
  value: TValue;
  errors: ValidationFailure[];
  sanitized: boolean;
  sanitizationActions: SanitizationAction[];
}

export interface ValidationOptions {
  sanitize?: boolean;
}

export interface CIGateCase<TValue> {
  name: string;
  output: TValue;
  contract: OutputContract<TValue>;
  sanitize?: boolean;
}

export interface CIGateReport<TValue> {
  name: string;
  result: ValidationResult<TValue>;
}

export function validateOutput<TValue>(
  output: TValue,
  contract: OutputContract<TValue>,
  options: ValidationOptions = {}
): ValidationResult<TValue> {
  const sanitization = options.sanitize ? sanitizeOutput(output, contract) : { value: output, actions: [] as SanitizationAction[] };
  const value = sanitization.value as TValue;
  const errors: ValidationFailure[] = [];

  if (contract.schema) {
    const validator = getSchemaValidator(contract.schema);
    const schemaValid = validator(value);
    if (!schemaValid) {
      for (const err of validator.errors ?? []) {
        errors.push(convertAjvError(err));
      }
    }
  }

  if (contract.regex) {
    const regexError = validateRegexConstraint(value, contract.regex);
    if (regexError) {
      errors.push(regexError);
    }
  }

  if (contract.enum) {
    const enumError = validateEnumConstraint(value, contract.enum);
    if (enumError) {
      errors.push(enumError);
    }
  }

  if (contract.forbidsPII) {
    const piiError = validatePiiConstraint(value, contract.forbidsPII === true ? {} : contract.forbidsPII);
    if (piiError) {
      errors.push(...piiError);
    }
  }

  if (contract.length) {
    const lengthError = validateLengthConstraint(value, contract.length);
    if (lengthError) {
      errors.push(lengthError);
    }
  }

  if (contract.range) {
    const rangeError = validateRangeConstraint(value, contract.range);
    if (rangeError) {
      errors.push(rangeError);
    }
  }

  if (contract.locale) {
    const localeError = validateLocaleConstraint(value, contract.locale);
    if (localeError) {
      errors.push(localeError);
    }
  }

  if (contract.customValidators) {
    for (const validator of contract.customValidators) {
      const failure = validator(value);
      if (failure) {
        errors.push(failure);
      }
    }
  }

  return {
    valid: errors.length === 0,
    value,
    errors,
    sanitized: sanitization.actions.length > 0,
    sanitizationActions: sanitization.actions
  };
}

export function sanitizeOutput<TValue>(value: TValue, contract: OutputContract<TValue>): { value: TValue; actions: SanitizationAction[] } {
  const actions: SanitizationAction[] = [];
  let currentValue: unknown = value;

  if (typeof currentValue === 'string') {
    const sanitizedString = sanitizeStringValue(currentValue, contract, actions);
    currentValue = sanitizedString;
  } else if (typeof currentValue === 'number' && contract.range) {
    const { nextValue, changed } = clampNumber(currentValue, contract.range);
    if (changed) {
      currentValue = nextValue;
      actions.push({ code: 'sanitize.range', message: `Clamped numeric value to range ${describeRange(contract.range)}.` });
    }
  }

  if (contract.locale) {
    const localeResult = sanitizeLocale(currentValue, contract.locale);
    currentValue = localeResult.value;
    if (localeResult.changed) {
      actions.push({ code: 'sanitize.locale', message: localeResult.message });
    }
  }

  return { value: currentValue as TValue, actions };
}

export function runCIGate<TValue>(cases: Array<CIGateCase<TValue>>): CIGateReport<TValue>[] {
  const reports: CIGateReport<TValue>[] = [];
  const failures: Array<{ name: string; errors: ValidationFailure[] }> = [];

  for (const testCase of cases) {
    const result = validateOutput(testCase.output, testCase.contract, { sanitize: testCase.sanitize });
    reports.push({ name: testCase.name, result });
    if (!result.valid) {
      failures.push({ name: testCase.name, errors: result.errors });
    }
  }

  if (failures.length > 0) {
    const messages = failures
      .map(({ name, errors }) => `- ${name}: ${errors.map((err) => err.message).join('; ')}`)
      .join('\n');
    const aggregate = new AggregateError(
      failures.map(({ name, errors }) => new Error(`[${name}] ${errors.map((err) => err.message).join('; ')}`)),
      `MOCC CI gate failed with ${failures.length} violation${failures.length === 1 ? '' : 's'}:\n${messages}`
    );
    throw aggregate;
  }

  return reports;
}

export function explainFailures(errors: ValidationFailure[]): string {
  if (errors.length === 0) {
    return 'No validation failures.';
  }

  return errors
    .map((error) => {
      const location = error.path ? ` at ${error.path}` : '';
      return `${error.code}${location}: ${error.message}`;
    })
    .join('\n');
}

function sanitizeStringValue(value: string, contract: OutputContract<unknown>, actions: SanitizationAction[]): string {
  let nextValue = value;

  if (contract.forbidsPII) {
    const piiOptions = contract.forbidsPII === true ? {} : contract.forbidsPII;
    const types = piiOptions?.types ?? DEFAULT_PII_TYPES;
    const matches = detectPii(nextValue, types);
    if (matches.length > 0) {
      const replacementPattern = piiOptions?.replacement ?? '[redacted:%type%]';
      nextValue = maskPii(nextValue, matches, replacementPattern);
      const uniqueTypes = [...new Set(matches.map((match) => match.type))];
      actions.push({
        code: 'sanitize.pii',
        message: `Masked ${matches.length} PII occurrence${matches.length === 1 ? '' : 's'} (${uniqueTypes.join(', ')}).`
      });
    }
  }

  if (contract.length?.max !== undefined) {
    const limit = contract.length.max;
    const graphemes = Array.from(nextValue);
    if (graphemes.length > limit) {
      nextValue = graphemes.slice(0, limit).join('');
      actions.push({ code: 'sanitize.length', message: `Trimmed output to max length of ${limit} characters.` });
    }
  }

  return nextValue;
}

function clampNumber(value: number, range: RangeConstraint): { nextValue: number; changed: boolean } {
  let nextValue = value;
  if (range.min !== undefined && nextValue < range.min) {
    nextValue = range.min;
  }
  if (range.max !== undefined && nextValue > range.max) {
    nextValue = range.max;
  }
  return { nextValue, changed: nextValue !== value };
}

function sanitizeLocale(value: unknown, constraint: LocaleConstraint): { value: unknown; changed: boolean; message: string } {
  const canonicalAllowed = constraint.canonicalize ? canonicalizeLocales(constraint.allowed) : constraint.allowed;

  if (typeof value === 'string') {
    const canonical = constraint.canonicalize ? canonicalizeLocale(value) : value;
    if (canonical !== value) {
      return {
        value: canonical,
        changed: true,
        message: `Canonicalized locale from "${value}" to "${canonical}".`
      };
    }
    return { value, changed: false, message: '' };
  }

  if (typeof value !== 'object' || value === null) {
    return { value, changed: false, message: '' };
  }

  const path = constraint.path ?? 'locale';
  const localeAccessor = resolvePath(value, path);
  if (!localeAccessor) {
    return { value, changed: false, message: '' };
  }

  const currentLocale = localeAccessor.value;
  if (typeof currentLocale !== 'string') {
    return { value, changed: false, message: '' };
  }

  const canonical = constraint.canonicalize ? canonicalizeLocale(currentLocale) : currentLocale;
  const allowedMatch = constraint.canonicalize ? canonicalAllowed : constraint.allowed;

  if (canonical !== currentLocale) {
    const cloned = cloneObject(value);
    const target = resolvePath(cloned, path);
    if (target) {
      target.parent[target.key] = canonical;
    }
    return {
      value: cloned,
      changed: true,
      message: `Canonicalized locale from "${currentLocale}" to "${canonical}".`
    };
  }

  if (allowedMatch.length > 0 && !allowedMatch.includes(canonical)) {
    return { value, changed: false, message: '' };
  }

  return { value, changed: false, message: '' };
}

function getSchemaValidator(schema: AnySchema): ValidateFunction {
  if (typeof schema !== 'object' || schema === null) {
    return ajv.compile(schema);
  }

  const cached = schemaCache.get(schema as object);
  if (cached) {
    return cached;
  }
  const validator = ajv.compile(schema);
  schemaCache.set(schema as object, validator);
  return validator;
}

function convertAjvError(error: ErrorObject): ValidationFailure {
  const path = error.instancePath ? error.instancePath.replace(/^\//, '').replace(/\//g, '.') : undefined;
  const message = error.message ?? 'Schema validation error.';
  return {
    code: 'constraint.schema',
    message: `${message}${error.params && 'allowedValues' in error.params ? ` (${JSON.stringify(error.params.allowedValues)})` : ''}`.trim(),
    path,
    meta: { keyword: error.keyword, params: error.params }
  };
}

function validateRegexConstraint(value: unknown, constraint: RegexConstraint): ValidationFailure | undefined {
  if (typeof value !== 'string') {
    return {
      code: 'constraint.regex',
      message: `Expected string to evaluate regex${constraint.description ? ` (${constraint.description})` : ''}.`,
      meta: { receivedType: typeof value }
    };
  }

  const flags = constraint.flags ?? '';
  const regex = new RegExp(constraint.pattern, flags.includes('g') ? flags : `${flags}g`);
  if (!regex.test(value)) {
    return {
      code: 'constraint.regex',
      message: `Value did not match pattern ${constraint.pattern}.`,
      meta: { pattern: constraint.pattern }
    };
  }
  return undefined;
}

function validateEnumConstraint(value: unknown, constraint: EnumConstraint): ValidationFailure | undefined {
  if (typeof value !== 'string') {
    return {
      code: 'constraint.enum',
      message: 'Enum constraint expects a string value.',
      meta: { receivedType: typeof value }
    };
  }

  const candidate = constraint.caseSensitive ? value : value.toLowerCase();
  const allowed = constraint.caseSensitive ? constraint.values : constraint.values.map((entry) => entry.toLowerCase());

  if (!allowed.includes(candidate)) {
    return {
      code: 'constraint.enum',
      message: `Value must be one of: ${constraint.values.join(', ')}.`,
      meta: { allowed: constraint.values }
    };
  }
  return undefined;
}

interface DetectedPii {
  type: PiiType;
  match: string;
  index: number;
}

function validatePiiConstraint(value: unknown, constraint?: PiiConstraint): ValidationFailure[] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const types = constraint?.types ?? DEFAULT_PII_TYPES;
  const matches = detectPii(value, types);
  if (matches.length === 0) {
    return undefined;
  }

  return matches.map((match) => ({
    code: 'constraint.pii',
    message: `Detected ${match.type.replace('_', ' ')}: "${match.match}".`,
    meta: { type: match.type, match: match.match, index: match.index }
  }));
}

function detectPii(value: string, types: readonly PiiType[]): DetectedPii[] {
  const results: DetectedPii[] = [];
  for (const type of types) {
    const pattern = PII_PATTERNS[type];
    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value)) !== null) {
      results.push({ type, match: match[0], index: match.index });
    }
  }
  return results.sort((a, b) => a.index - b.index);
}

function maskPii(value: string, matches: DetectedPii[], replacementPattern: string): string {
  if (matches.length === 0) {
    return value;
  }

  let result = '';
  let cursor = 0;

  for (const match of matches) {
    result += value.slice(cursor, match.index);
    const replacement = replacementPattern.replace('%type%', match.type).replace('%original%', match.match);
    result += replacement;
    cursor = match.index + match.match.length;
  }

  result += value.slice(cursor);
  return result;
}

function validateLengthConstraint(value: unknown, constraint: LengthConstraint): ValidationFailure | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const length = Array.from(value).length;
  if (constraint.min !== undefined && length < constraint.min) {
    return {
      code: 'constraint.length',
      message: `Value is shorter than minimum length of ${constraint.min}.`,
      meta: { length, min: constraint.min }
    };
  }
  if (constraint.max !== undefined && length > constraint.max) {
    return {
      code: 'constraint.length',
      message: `Value exceeds maximum length of ${constraint.max}.`,
      meta: { length, max: constraint.max }
    };
  }
  return undefined;
}

function validateRangeConstraint(value: unknown, constraint: RangeConstraint): ValidationFailure | undefined {
  if (typeof value !== 'number') {
    return {
      code: 'constraint.range',
      message: 'Range constraint expects a numeric value.',
      meta: { receivedType: typeof value }
    };
  }

  if (constraint.min !== undefined && value < constraint.min) {
    return {
      code: 'constraint.range',
      message: `Value ${value} is below minimum ${constraint.min}.`,
      meta: { min: constraint.min, value }
    };
  }
  if (constraint.max !== undefined && value > constraint.max) {
    return {
      code: 'constraint.range',
      message: `Value ${value} exceeds maximum ${constraint.max}.`,
      meta: { max: constraint.max, value }
    };
  }
  return undefined;
}

function validateLocaleConstraint(value: unknown, constraint: LocaleConstraint): ValidationFailure | undefined {
  const allowed = constraint.canonicalize ? canonicalizeLocales(constraint.allowed) : constraint.allowed;
  const localeValue = extractLocale(value, constraint.path);

  if (!localeValue) {
    return undefined;
  }

  const locale = constraint.canonicalize ? canonicalizeLocale(localeValue) : localeValue;
  if (allowed.length > 0 && !allowed.includes(locale)) {
    return {
      code: 'constraint.locale',
      message: `Locale "${localeValue}" is not permitted. Allowed locales: ${allowed.join(', ')}.`,
      meta: { locale: localeValue, allowed }
    };
  }

  return undefined;
}

function extractLocale(value: unknown, path?: string): string | undefined {
  if (typeof value === 'string' && !path) {
    return value;
  }

  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const targetPath = path ?? 'locale';
  const accessor = resolvePath(value, targetPath);
  if (!accessor) {
    return undefined;
  }

  const localeValue = accessor.value;
  return typeof localeValue === 'string' ? localeValue : undefined;
}

function resolvePath(value: unknown, path: string): { parent: Record<string, any>; key: string; value: unknown } | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const segments = path.split('.');
  let parent: Record<string, any> | undefined = value as Record<string, any>;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    if (!parent || typeof parent !== 'object') {
      return undefined;
    }
    parent = parent[key];
  }

  if (!parent || typeof parent !== 'object') {
    return undefined;
  }

  const key = segments[segments.length - 1];
  return {
    parent,
    key,
    value: parent[key]
  };
}

function cloneObject<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function canonicalizeLocale(locale: string): string {
  try {
    const [canonical] = Intl.getCanonicalLocales([locale]);
    return canonical ?? locale;
  } catch (error) {
    return locale;
  }
}

function canonicalizeLocales(locales: string[]): string[] {
  return locales.map((locale) => canonicalizeLocale(locale));
}

function describeRange(range: RangeConstraint): string {
  const parts: string[] = [];
  if (range.min !== undefined) {
    parts.push(`min ${range.min}`);
  }
  if (range.max !== undefined) {
    parts.push(`max ${range.max}`);
  }
  return parts.join(', ');
}
