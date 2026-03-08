"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditorPortal = exports.ControlCrosswalk = void 0;
const quantum_safe_ledger_js_1 = require("./quantum-safe-ledger.js");
function toFrameworkList(frameworks) {
    const list = Array.isArray(frameworks) ? frameworks : [frameworks];
    return Array.from(new Set(list)).sort();
}
class ControlCrosswalk {
    controls = new Map();
    now;
    constructor(now = () => new Date()) {
        this.now = now;
    }
    registerCanonical(control) {
        const existing = this.controls.get(control.id);
        if (existing) {
            existing.title = control.title;
            existing.description = control.description ?? existing.description;
            return;
        }
        this.controls.set(control.id, {
            canonicalId: control.id,
            title: control.title,
            description: control.description,
            frameworks: new Map(),
            evidence: new Map(),
        });
    }
    linkFrameworkControl(canonicalId, control) {
        const record = this.controls.get(canonicalId);
        if (!record) {
            throw new Error(`Unknown canonical control ${canonicalId}`);
        }
        record.frameworks.set(control.framework, control);
        return control;
    }
    attachEvidence(canonicalId, artifact) {
        const record = this.controls.get(canonicalId);
        if (!record) {
            throw new Error(`Unknown canonical control ${canonicalId}`);
        }
        const existing = record.evidence.get(artifact.id);
        const merged = {
            ...artifact,
            controlIds: artifact.controlIds ?? [canonicalId],
        };
        record.evidence.set(artifact.id, merged);
        return existing ?? merged;
    }
    bundleForFrameworks(frameworks) {
        const targetFrameworks = toFrameworkList(frameworks);
        let mappedFrameworks = 0;
        let evidenceCount = 0;
        const controls = [];
        this.controls.forEach((record) => {
            const matches = targetFrameworks
                .map((framework) => record.frameworks.get(framework))
                .filter((item) => Boolean(item));
            if (!matches.length) {
                return;
            }
            mappedFrameworks += matches.length;
            const evidence = Array.from(record.evidence.values());
            evidenceCount += evidence.length;
            controls.push({
                canonicalId: record.canonicalId,
                canonicalTitle: record.title,
                frameworks: matches,
                evidence,
            });
        });
        controls.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
        return {
            generatedAt: this.now().toISOString(),
            frameworks: targetFrameworks,
            controls,
            coverage: {
                canonical: controls.length,
                frameworkMappings: mappedFrameworks,
                evidence: evidenceCount,
            },
            readOnly: false,
        };
    }
    coverageFor(framework) {
        const total = this.controls.size;
        let mapped = 0;
        this.controls.forEach((record) => {
            if (record.frameworks.has(framework)) {
                mapped += 1;
            }
        });
        const percent = total === 0 ? 0 : Number(((mapped / total) * 100).toFixed(2));
        return { mapped, total, percent };
    }
}
exports.ControlCrosswalk = ControlCrosswalk;
class AuditorPortal {
    tokenService;
    crosswalk;
    now;
    constructor(options = {}) {
        this.now = options.now ?? (() => new Date());
        this.crosswalk = options.crosswalk ?? new ControlCrosswalk(this.now);
        this.tokenService = new quantum_safe_ledger_js_1.AccessTokenService(options.tokenSecret ?? 'audit-portal-secret', {
            ttlMs: options.tokenTtlMs ?? 10 * 60 * 1000,
            now: this.now,
        });
    }
    issueReadOnlyToken(auditorId, frameworks) {
        const scope = this.encodeFrameworkScope(frameworks);
        return this.tokenService.issue(auditorId, scope).token;
    }
    fetchEvidenceBundle(token, frameworks) {
        const payload = this.tokenService.verify(token);
        if (!payload) {
            throw new Error('Invalid or expired auditor token');
        }
        const allowedFrameworks = this.decodeFrameworkScope(payload.scope);
        const requested = frameworks
            ? toFrameworkList(frameworks)
            : [...allowedFrameworks];
        const unauthorized = requested.filter((framework) => !allowedFrameworks.includes(framework));
        if (unauthorized.length) {
            throw new Error(`Token does not permit frameworks: ${unauthorized.join(', ')}`);
        }
        const bundle = this.crosswalk.bundleForFrameworks(requested);
        return { ...bundle, readOnly: true };
    }
    encodeFrameworkScope(frameworks) {
        const list = toFrameworkList(frameworks);
        return `auditor:read:${list.join('|')}`;
    }
    decodeFrameworkScope(scope) {
        const [role, mode, list] = scope.split(':');
        if (role !== 'auditor' || mode !== 'read') {
            throw new Error('Token is not read-only auditor scope');
        }
        if (!list) {
            return [];
        }
        return list.split('|').filter(Boolean);
    }
}
exports.AuditorPortal = AuditorPortal;
