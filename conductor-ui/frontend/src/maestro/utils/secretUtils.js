// Secret handling and redaction utilities
const SENSITIVE_PATTERNS = [
  /(?:password|passwd|pwd|pass)\s*[:=]\s*["']?([^"'\s\n]+)["']?/gi,
  /(?:secret|token|key|api_key|auth)\s*[:=]\s*["']?([^"'\s\n]+)["']?/gi,
  /(?:bearer|authorization)\s*[:=]\s*["']?([^"'\s\n]+)["']?/gi,
  /(?:username|user|email)\s*[:=]\s*["']?([^"'\s\n@]+@[^"'\s\n]+)["']?/gi,
  /(?:connection_string|database_url|redis_url)\s*[:=]\s*["']?([^"'\s\n]+)["']?/gi,
  // AWS credentials
  /(?:AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*["']?([^"'\s\n]+)["']?/gi,
  // Generic patterns for hex keys and tokens
  /\b[A-Fa-f0-9]{32,}\b/g,
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/g, // Base64
];
/**
 * Redacts sensitive information from text
 */
export const redactSensitive = (text, options = {}) => {
  const {
    showFirst = 0,
    showLast = 0,
    replacement = '***REDACTED***',
  } = options;
  let redacted = text;
  SENSITIVE_PATTERNS.forEach((pattern) => {
    redacted = redacted.replace(pattern, (match, captured) => {
      if (captured) {
        const start = captured.substring(0, showFirst);
        const end = captured.substring(
          Math.max(showFirst, captured.length - showLast),
        );
        return match.replace(captured, `${start}${replacement}${end}`);
      }
      return replacement;
    });
  });
  return redacted;
};
/**
 * Checks if text contains sensitive information
 */
export const containsSensitive = (text) => {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
};
/**
 * Masks a secret value for display
 */
export const maskSecret = (secret, options = {}) => {
  const { showFirst = 4, showLast = 4 } = options;
  if (secret.length <= showFirst + showLast) {
    return '***';
  }
  const start = secret.substring(0, showFirst);
  const end = secret.substring(secret.length - showLast);
  const middle = '*'.repeat(Math.min(12, secret.length - showFirst - showLast));
  return `${start}${middle}${end}`;
};
/**
 * Creates a secure copy function with warning
 */
export const createSecureCopy = (value, onCopy) => {
  return async () => {
    if (containsSensitive(value)) {
      const confirmed = window.confirm(
        'This value may contain sensitive information. Are you sure you want to copy it to clipboard?',
      );
      if (!confirmed) return;
    }
    try {
      await navigator.clipboard.writeText(value);
      onCopy?.();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      onCopy?.();
    }
  };
};
/**
 * Sanitizes logs and error messages for display
 */
export const sanitizeLogs = (logs) => {
  return logs.map((log) => redactSensitive(log, { showFirst: 2, showLast: 2 }));
};
/**
 * Validates if a secret meets security requirements
 */
export const validateSecretStrength = (secret) => {
  const issues = [];
  let score = 0;
  if (secret.length < 12) {
    issues.push('Secret should be at least 12 characters long');
  } else {
    score += 2;
  }
  if (!/[A-Z]/.test(secret)) {
    issues.push('Secret should contain uppercase letters');
  } else {
    score += 1;
  }
  if (!/[a-z]/.test(secret)) {
    issues.push('Secret should contain lowercase letters');
  } else {
    score += 1;
  }
  if (!/\d/.test(secret)) {
    issues.push('Secret should contain numbers');
  } else {
    score += 1;
  }
  if (!/[^A-Za-z0-9]/.test(secret)) {
    issues.push('Secret should contain special characters');
  } else {
    score += 1;
  }
  // Check for common patterns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /(.)\1{3,}/, // Repeated characters
  ];
  if (commonPatterns.some((pattern) => pattern.test(secret))) {
    issues.push('Secret contains common patterns');
    score -= 2;
  }
  return {
    isValid: issues.length === 0 && score >= 4,
    score: Math.max(0, Math.min(5, score)),
    issues,
  };
};
