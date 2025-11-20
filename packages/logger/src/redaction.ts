/**
 * Sensitive data redaction utilities
 * Redacts passwords, tokens, PII, and other sensitive information
 */

export const SENSITIVE_FIELD_PATTERNS = [
  // Authentication & Authorization
  /password/i,
  /passwd/i,
  /pwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /authorization/i,
  /bearer/i,

  // Personal Identifiable Information (PII)
  /ssn/i,
  /social[_-]?security/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /pin/i,
  /license/i,
  /passport/i,
  /tax[_-]?id/i,

  // Privacy sensitive
  /email/i,
  /phone/i,
  /address/i,
  /dob/i,
  /birth[_-]?date/i,
  /salary/i,
  /income/i,
];

/**
 * Default paths to redact in logs
 * Compatible with pino's redact option
 */
export const DEFAULT_REDACT_PATHS = [
  // Request/Response
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.body.password',
  'req.body.token',
  'req.body.secret',
  'req.body.apiKey',
  'req.body.creditCard',
  'req.body.ssn',

  // User data
  'user.password',
  'user.passwordHash',
  'user.token',
  'user.refreshToken',
  'user.accessToken',
  'user.ssn',
  'user.creditCard',

  // General patterns
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.apiKey',
  '*.secret',
  '*.privateKey',
  '*.ssn',
  '*.creditCard',
  '*.cardNumber',
];

/**
 * Check if a field name is sensitive
 */
export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Redact sensitive values from an object
 * This is a deep redaction that walks the entire object tree
 */
export function redactSensitiveData<T>(
  obj: T,
  redactValue = '[REDACTED]'
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, redactValue)) as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      result[key] = redactValue;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveData(value, redactValue);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Redact email addresses to show only domain
 * Example: user@example.com -> u***@example.com
 */
export function redactEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '[REDACTED]';

  const [local, domain] = parts;
  const redactedLocal = local.length > 1
    ? `${local[0]}${'*'.repeat(Math.min(local.length - 1, 3))}`
    : '*';

  return `${redactedLocal}@${domain}`;
}

/**
 * Redact credit card numbers to show only last 4 digits
 * Example: 1234567890123456 -> ************3456
 */
export function redactCreditCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s+/g, '');
  if (cleaned.length < 4) return '[REDACTED]';

  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}

/**
 * Redact SSN to show only last 4 digits
 * Example: 123-45-6789 -> ***-**-6789
 */
export function redactSSN(ssn: string): string {
  const cleaned = ssn.replace(/[^\d]/g, '');
  if (cleaned.length !== 9) return '[REDACTED]';

  const last4 = cleaned.slice(-4);
  return `***-**-${last4}`;
}

/**
 * Redact phone numbers to show only last 4 digits
 * Example: (555) 123-4567 -> ***-***-4567
 */
export function redactPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '[REDACTED]';

  return '***-***-' + cleaned.slice(-4);
}
