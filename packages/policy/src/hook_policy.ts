export type HookPolicyResult = {
  allowed: boolean;
  reason?: string;
};

export class HookPolicy {
  private allowedHooks: Set<string>;

  constructor(profile: 'safe' | 'unrestricted' = 'safe') {
    if (profile === 'safe') {
      // Whitelist only safe hooks (reminders, pauses)
      this.allowedHooks = new Set(['tmux-reminder', 'git-push-pause']);
    } else {
      // In a real implementation, this might be more permissive but still gated
      this.allowedHooks = new Set(['*']);
    }
  }

  validate(hookName: string, scriptContent: string): HookPolicyResult {
    // 1. Check allowlist
    if (!this.allowedHooks.has(hookName) && !this.allowedHooks.has('*')) {
      return { allowed: false, reason: `Hook '${hookName}' is not in the allowed list for this profile.` };
    }

    // 2. Static analysis (simplified for MWS)
    if (this.isRisky(scriptContent)) {
      return { allowed: false, reason: "Script contains risky commands (network/fs)." };
    }

    return { allowed: true };
  }

  private isRisky(content: string): boolean {
    const riskyPatterns = ['curl ', 'wget ', 'ssh ', 'rm -rf', '> /etc/'];
    return riskyPatterns.some(p => content.includes(p));
  }
}
