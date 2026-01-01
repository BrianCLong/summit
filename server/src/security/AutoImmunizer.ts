
interface AutoRule {
  id: string;
  target: string; // IP or UserID
  type: 'BLOCK_IP' | 'LOCK_ACCOUNT';
  reason: string;
  expiresAt: Date;
}

export class AutoImmunizerService {
  private static instance: AutoImmunizerService;
  private activeRules: Map<string, AutoRule> = new Map();

  private constructor() {}

  public static getInstance(): AutoImmunizerService {
    if (!AutoImmunizerService.instance) {
      AutoImmunizerService.instance = new AutoImmunizerService();
    }
    return AutoImmunizerService.instance;
  }

  public processAuthFailure(ip: string, userId?: string) {
    // Simple logic: In a real system, this would use a sliding window or TokenBucket
    // For this MVP, we just log it.
    // If we had a state store, we'd increment a counter.
  }

  /**
   * Manually trigger a rule for testing/admin.
   */
  public createBlockRule(target: string, durationSeconds: number): AutoRule {
    const rule: AutoRule = {
      id: crypto.randomUUID(),
      target,
      type: 'BLOCK_IP',
      reason: 'Automated Defense Activation',
      expiresAt: new Date(Date.now() + durationSeconds * 1000)
    };
    this.activeRules.set(target, rule);
    console.log(`[AutoImmunizer] Applied rule: Block ${target} until ${rule.expiresAt}`);
    return rule;
  }

  public isBlocked(target: string): boolean {
    const rule = this.activeRules.get(target);
    if (!rule) return false;

    if (new Date() > rule.expiresAt) {
      this.activeRules.delete(target);
      return false;
    }
    return true;
  }
}
