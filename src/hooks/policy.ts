export type HookTrigger = 'PreToolUse' | 'PostToolUse' | 'Stop';

export type HookEvent = {
  tool: string;
  toolInput: any;
  trigger?: HookTrigger;
  filePath?: string;
  commandId?: string;
};

export type PolicyDecision = {
  allowed: boolean;
  reason?: string;
};

export interface HookPolicyConfig {
  allowlist?: string[];
  unsafeEnabled?: boolean;
}

/**
 * Evaluates a hook event against a deny-by-default policy.
 */
export function evaluatePolicy(
  event: HookEvent,
  config: HookPolicyConfig = {}
): PolicyDecision {
  // Deny raw shell unless explicitly enabled via config or env var
  if (event.tool === 'shell' || event.tool === 'bash') {
    if (!config.unsafeEnabled && process.env.SUMMIT_HOOKS_UNSAFE !== '1') {
      return {
        allowed: false,
        reason: 'Raw shell execution is denied by default.',
      };
    }
    return { allowed: true };
  }

  // Allow internal commands if they are in the allowlist
  if (event.commandId) {
    if (config.allowlist?.includes(event.commandId)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Command '${event.commandId}' is not in the allowlist.`,
    };
  }

  // Default: Deny everything else
  return {
    allowed: false,
    reason: 'No matching policy found (deny-by-default).',
  };
}

/**
 * Redacts secrets from the given data object or array.
 */
export function redactSecrets(data: any): any {
  if (typeof data !== 'object' || data === null) return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item));
  }

  const result: any = {};
  for (const key in data) {
    const value = data[key];
    if (
      typeof value === 'string' &&
      /KEY|TOKEN|SECRET|PASSWORD/i.test(key)
    ) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSecrets(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
