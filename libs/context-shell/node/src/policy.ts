import { ContextShellPolicy, PolicyDecision, PolicyInput } from './types.js';
import { DEFAULT_DENYLIST } from './utils.js';

const DEFAULT_ALLOWED_COMMANDS: Record<string, string[]> = {
  ls: ['-a', '-l'],
  pwd: [],
  cat: [],
  rg: ['-n', '--line-number'],
};

export interface DefaultPolicyOptions {
  allowedCommands?: Record<string, string[]>;
  denylist?: Array<{ id: string; pattern: RegExp }>;
  requireWriteJustification?: boolean;
  requirePatchFormat?: boolean;
}

export function createDefaultPolicy(
  options: DefaultPolicyOptions = {}
): ContextShellPolicy {
  const allowedCommands = options.allowedCommands ?? DEFAULT_ALLOWED_COMMANDS;
  const denylist = options.denylist ?? DEFAULT_DENYLIST;
  const requireWriteJustification = options.requireWriteJustification ?? true;
  const requirePatchFormat = options.requirePatchFormat ?? true;

  return {
    id: 'context-shell-default',
    version: 'v1',
    evaluate: (input: PolicyInput): PolicyDecision => {
      if (input.tool === 'ctx.bash') {
        if (!input.command) {
          return deny('missing-command');
        }
        if (!allowedCommands[input.command]) {
          return deny('command-not-allowed');
        }
        const allowedFlags = new Set(allowedCommands[input.command]);
        const args = input.args ?? [];
        for (const arg of args) {
          if (arg.startsWith('-') && !allowedFlags.has(arg)) {
            return deny('flag-not-allowed');
          }
        }
      }

      if (input.tool === 'ctx.writeFile') {
        if (requireWriteJustification && !input.justification) {
          return deny('write-requires-justification');
        }
        if (requirePatchFormat && input.format !== 'patch') {
          return deny('write-requires-patch-format');
        }
      }

      if (input.path) {
        const normalized = input.path.replace(/\\/g, '/');
        for (const rule of denylist) {
          if (rule.pattern.test(normalized)) {
            return deny(`path-denied:${rule.id}`);
          }
        }
      }

      return allow();
    },
  };
}

function allow(): PolicyDecision {
  return { allowed: true, decisionId: 'allow' };
}

function deny(reason: string): PolicyDecision {
  return { allowed: false, decisionId: `deny:${reason}`, reason };
}
