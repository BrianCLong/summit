/**
 * Deterministic Secret/PII Redaction Module
 * Provides stable, idempotent redaction with consistent reporting
 */

import { createHash } from 'node:crypto';

// Define regex patterns for different types of secrets/common PII
const REDACTION_PATTERNS = [
  // GitHub tokens
  {
    kind: 'github_token',
    regex: /(ghp_[a-zA-Z0-9_]{36}|github_pat_[a-zA-Z0-9_]{40,})/gi,
    replacement: '[GITHUB_TOKEN_REDACTED]'
  },
  // AWS access keys
  {
    kind: 'aws_access_key',
    regex: /(?<!\w)(AKIA|ASIA)[A-Z0-9]{16}(?!\w)/gi,
    replacement: '[AWS_ACCESS_KEY_REDACTED]'
  },
  // Slack tokens
  {
    kind: 'slack_token',
    regex: /(?<!\w)(xox[abpr]-[0-9]{8,}-[0-9]{8,}-[0-9a-zA-Z]{6,}|xoxe-\d+-\d+-\d+-[a-z0-9]+)/gi,
    replacement: '[SLACK_TOKEN_REDACTED]'
  },
  // Private key blocks
  {
    kind: 'private_key',
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: '[PRIVATE_KEY_BLOCK_REDACTED]'
  },
  // Generic API keys (long tokens starting with common prefixes)
  {
    kind: 'generic_api_key',
    regex: /(?<!\w)(sk|pk|rk|ak|api)_\w{20,}(?!\w)/gi,
    replacement: '[API_KEY_REDACTED]'
  },
  // JWT tokens (3 base64url segments)
  {
    kind: 'jwt',
    regex: /(?<!\w)(eyJ[^.]+\.[^.]+\.[^.]+)(?!\w)/g,
    replacement: '[JWT_REDACTED]'
  },
  // Email addresses
  {
    kind: 'email',
    regex: /(?<!\w)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}(?!\w)/gi,
    replacement: '[EMAIL_REDACTED]'
  },
  // IP addresses (basic pattern)
  {
    kind: 'ip_address',
    regex: /(?<!\d)(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?!\d)/g,
    replacement: '[IP_ADDRESS_REDACTED]'
  }
];

/**
 * Redact secrets and PII from text while maintaining determinism
 * @param {string} input - Input text to redact
 * @param {Object} opts - Options
 * @param {'strict' | 'balanced'} opts.mode - Redaction strictness
 * @returns {{redacted: string, findings: Array<{kind: string, count: number}>}} - Redacted text and findings
 */
function redactText(input, opts = {}) {
  if (!input || typeof input !== 'string') {
    return { redacted: input || '', findings: [] };
  }

  const mode = opts.mode || 'balanced';
  let redacted = input;
  const allFindings = {};

  // Apply each redaction pattern
  for (const pattern of REDACTION_PATTERNS) {
    // Reset regex for accurate counting
    pattern.regex.lastIndex = 0;
    
    // Count matches before applying redaction
    const matches = redacted.match(pattern.regex) || [];
    
    if (matches.length > 0) {
      // Apply redaction
      if (mode === 'strict' || shouldRedactPattern(pattern.kind)) {
        redacted = redacted.replaceAll(pattern.regex, pattern.replacement);
        allFindings[pattern.kind] = (allFindings[pattern.kind] || 0) + matches.length;
      }
    }
    
    // Reset the regex after use
    pattern.regex.lastIndex = 0;
  }

  // Convert findings object to sorted array for deterministic output
  const sortedFindings = Object.keys(allFindings)
    .sort()
    .map(kind => ({
      kind,
      count: allFindings[kind]
    }));

  return {
    redacted,
    findings: sortedFindings
  };
}

/**
 * Determines if a pattern should be redacted based on mode
 */
function shouldRedactPattern(kind) {
  // For now, redact all patterns except emails in balanced mode
  return kind !== 'email'; // Only redact emails if in strict mode
}

/**
 * Idempotent redaction - running twice should produce the same result
 * @param {string} input - Input text
 * @returns {boolean} - Whether redaction is idempotent
 */
function isRedactionIdempotent(input) {
  const firstPass = redactText(input);
  const secondPass = redactText(firstPass.redacted);
  
  // For idempotency test, we only care about the redacted text content
  return firstPass.redacted === secondPass.redacted;
}

/**
 * Check that no raw secrets appear in output (safety test)
 * @param {string} input - Original input
 * @param {string} output - Redacted output
 * @returns {boolean} - True if no raw secrets appear in output
 */
function noRawSecretsInOutput(input, output) {
  for (const pattern of REDACTION_PATTERNS) {
    const matches = input.match(pattern.regex) || [];
    for (const match of matches) {
      if (output.includes(match)) {
        return false; // Found raw secret in output
      }
    }
  }
  return true;
}

export {
  redactText,
  isRedactionIdempotent,
  noRawSecretsInOutput
};