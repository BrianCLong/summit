export class ObserverPolicy {
  static async check(action: string, context: any = {}): Promise<{ allowed: boolean; reason: string }> {
    const ALLOWED_ACTIONS = ['log_event', 'monitor', 'alert'];

    if (ALLOWED_ACTIONS.includes(action)) {
      return { allowed: true, reason: `Action '${action}' is permitted for Observer` };
    }

    return { allowed: false, reason: `Action '${action}' blocked by default policy` };
  }
}
