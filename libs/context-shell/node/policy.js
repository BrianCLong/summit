import { createHash } from 'crypto';
import path from 'path';
const defaultAllowedCommands = {
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
export class AllowlistPolicy {
    version = 'context-shell-policy.v1';
    options;
    constructor(options) {
        this.options = {
            allowedCommands: options?.allowedCommands ?? defaultAllowedCommands,
            denyPaths: options?.denyPaths ?? defaultDenyPaths,
            allowPaths: options?.allowPaths ?? defaultAllowPaths,
            requireWriteJustification: options?.requireWriteJustification ?? true,
        };
    }
    normalizeCommand(command, args) {
        return [command, ...args].join(' ').trim();
    }
    evaluate(context) {
        const payload = JSON.stringify({
            version: this.version,
            context,
        });
        const decisionId = createHash('sha256').update(payload).digest('hex');
        if (context.operation === 'command') {
            const allowedFlags = this.options.allowedCommands[context.command ?? ''] ?? null;
            if (!allowedFlags) {
                return {
                    allow: false,
                    decisionId,
                    reason: `Command not allowlisted: ${context.command}`,
                };
            }
            const invalidFlags = (context.args ?? []).filter((arg) => arg.startsWith('-') ? !allowedFlags.includes(arg) : false);
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
            const allowed = (this.options.allowPaths ?? []).some((rule) => rule.test(normalized));
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
        if (context.operation === 'write' &&
            this.options.requireWriteJustification &&
            !context.justification) {
            return {
                allow: false,
                decisionId,
                reason: 'Write requires justification',
            };
        }
        return { allow: true, decisionId };
    }
}
//# sourceMappingURL=policy.js.map