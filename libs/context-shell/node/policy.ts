import { createHash } from 'crypto';
import path from 'path';
import {
  ContextShellPolicy,
  PolicyContext,
  PolicyDecision,
} from './types.js';

export interface PolicyOptions {
  allowedCommands: Record<string, string[]>;
  denyPaths: RegExp[];
  allowPaths?: RegExp[];
  requireWriteJustification: boolean;
}

const defaultAllowedCommands: Record<string, string[]> = {
  pwd: [],
  ls: ['-a', '-l'],
  cat: [],
  rg: ['-n'],
  find: [],
  wc: ['-l'],
};

const defaultDenyPaths = [
  /\.env(\.|$)/,
  /\/\.git(\/(.|$))?/,
  /node_modules\//,
  /\bsecrets?\b/i,
  /\bkeys?\b/i,
];

const defaultAllowPaths = [/^.*$/];

export class AllowlistPolicy implements ContextShellPolicy {
  readonly version = 'context-shell-policy.v1';
  private options: PolicyOptions;

  constructor(options?: Partial<PolicyOptions>) {
    this.options = {
      allowedCommands: options?.allowedCommands ?? defaultAllowedCommands,
      denyPaths: options?.denyPaths ?? defaultDenyPaths,
      allowPaths: options?.allowPaths ?? defaultAllowPaths,
      requireWriteJustification: options?.requireWriteJustification ?? true,
    };
  }

  normalizeCommand(command: string, args: string[]): string {
    return [command, ...args].join(' ').trim();
  }

  evaluate(context: PolicyContext): PolicyDecision {
    const payload = JSON.stringify({
      version: this.version,
      context,
    });
    const decisionId = createHash('sha256').update(payload).digest('hex');

    if (context.operation === 'command') {
      const allowedFlags =
        this.options.allowedCommands[context.command ?? ''] ?? null;
      if (!allowedFlags) {
        return {
          allow: false,
          decisionId,
          reason: `Command not allowlisted: ${context.command}`,
        };
      }
      const invalidFlags = (context.args ?? []).filter((arg) =>
        arg.startsWith('-') ? !allowedFlags.includes(arg) : false,
      );
      if (invalidFlags.length > 0) {
        return {
          allow: false,
          decisionId,
          reason: `Flags not allowlisted: ${invalidFlags.join(', ')}`,
        };
      }
      return { allow: true, decisionId };
    }

    if (context.path) {
      const normalized = path
        .normalize(context.path)
        .replace(/\\/g, '/');
      const allowed = (this.options.allowPaths ?? []).some((rule) =>
        rule.test(normalized),
      );
      if (!allowed) {
        return {
          allow: false,
          decisionId,
          reason: `Path not allowlisted: ${normalized}`,
        };
      }
      const denied = this.options.denyPaths.some((rule) => rule.test(normalized));
      if (denied) {
        return {
          allow: false,
          decisionId,
          reason: `Path denied: ${normalized}`,
        };
      }
    }

    if (
      context.operation === 'write' &&
      this.options.requireWriteJustification &&
      !context.justification
    ) {
      return {
        allow: false,
        decisionId,
        reason: 'Write requires justification',
      };
    }

    return { allow: true, decisionId };
  }
}
