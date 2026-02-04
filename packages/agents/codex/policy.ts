export class CodexPolicy {
  static async check(action: string, context: any = {}): Promise<{ allowed: boolean; reason: string }> {
    const ALLOWED_ACTIONS = ['generate_code', 'review_code', 'test_code'];

    if (ALLOWED_ACTIONS.includes(action)) {
      return { allowed: true, reason: `Action '${action}' is permitted for Codex` };
    }

    return { allowed: false, reason: `Action '${action}' blocked by default policy` };
  }
}
