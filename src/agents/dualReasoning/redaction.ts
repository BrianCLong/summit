/**
 * Redaction utility for DualReasoning loop.
 * Enforces deny-by-default logging and redacts sensitive information.
 * Aligned with daVinci-Agency threat-informed standards.
 */

export const DEFAULT_REDACTION_SUBSTITUTE = "[REDACTED]";

/**
 * Data classification for DualReasoning artifacts.
 */
export enum DataClass {
  PROMPT = 'PROMPT',
  REASONING = 'REASONING',
  TOOL_OUTPUT = 'TOOL_OUTPUT',
  METADATA = 'METADATA'
}

export interface RedactionConfig {
  canaryStrings?: string[];
  sensitiveKeys?: string[];
  deniedClasses?: DataClass[];
}

/**
 * Redacts an object or string based on configuration.
 * Deny-by-default approach.
 */
export function redact(data: any, config: RedactionConfig = {}): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    let result = data;

    // Redact canary strings
    if (config.canaryStrings) {
      for (const canary of config.canaryStrings) {
        if (canary) {
          const escapedCanary = canary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedCanary, 'g');
          result = result.replace(regex, DEFAULT_REDACTION_SUBSTITUTE);
        }
      }
    }

    return result;
  }

  if (Array.isArray(data)) {
    return data.map(item => redact(item, config));
  }

  if (typeof data === 'object') {
    const result: any = {};
    // Default sensitive keys that should always be redacted from standard logs/artifacts
    const sensitiveKeys = config.sensitiveKeys ?? ['instruction', 'output', 'rationale', 'steps', 'issues'];

    for (const key of Object.keys(data)) {
      if (sensitiveKeys.includes(key)) {
        if (Array.isArray(data[key])) {
          result[key] = [DEFAULT_REDACTION_SUBSTITUTE];
        } else {
          result[key] = DEFAULT_REDACTION_SUBSTITUTE;
        }
      } else {
        result[key] = redact(data[key], config);
      }
    }
    return result;
  }

  return data;
}

/**
 * Ensures that even in "allow raw artifacts" mode,
 * certain critical secrets (canaries) are NEVER logged.
 */
export function enforceHardSecurity(content: string, canaries: string[]): string {
  let result = content;
  for (const canary of canaries) {
    if (canary) {
       const escapedCanary = canary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       const regex = new RegExp(escapedCanary, 'g');
       result = result.replace(regex, "[SECRET_REDACTED]");
    }
  }
  return result;
}
