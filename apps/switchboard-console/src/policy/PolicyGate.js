"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyGate = void 0;
const parseAllowlist = (raw) => {
    if (!raw) {
        return [];
    }
    return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};
class PolicyGate {
    allowlist;
    mode;
    constructor() {
        const mode = process.env.SWITCHBOARD_RUN_MODE ?? 'deny';
        if (mode === 'allow') {
            this.mode = 'allow-all';
        }
        else if (mode === 'allowlist') {
            this.mode = 'allowlist';
        }
        else {
            this.mode = 'deny-by-default';
        }
        this.allowlist = parseAllowlist(process.env.SWITCHBOARD_ALLOWED_COMMANDS);
    }
    evaluate(command) {
        if (this.mode === 'allow-all') {
            return {
                allowed: true,
                reason: 'SWITCHBOARD_RUN_MODE=allow',
                mode: this.mode,
            };
        }
        if (this.mode === 'allowlist') {
            const base = command.trim().split(' ')[0] ?? '';
            const allowed = this.allowlist.includes(base);
            return {
                allowed,
                reason: allowed
                    ? 'Command allowed by allowlist'
                    : 'Command not in allowlist',
                mode: this.mode,
            };
        }
        return {
            allowed: false,
            reason: 'Command execution disabled by policy',
            mode: this.mode,
        };
    }
}
exports.PolicyGate = PolicyGate;
