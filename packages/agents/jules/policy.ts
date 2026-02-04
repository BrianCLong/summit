export class JulesPolicy {
  static async check(action: string, context: any = {}): Promise<{ allowed: boolean; reason: string }> {
    // Whitelist allowed actions
    const ALLOWED_ACTIONS = ['safe_read', 'plan', 'reflect'];

    if (ALLOWED_ACTIONS.includes(action)) {
      return { allowed: true, reason: `Action '${action}' is permitted for Jules` };
    }

    // Deny by default
    return { allowed: false, reason: `Action '${action}' blocked by default policy` };
  }
}
