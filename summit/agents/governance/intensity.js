"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIntensity = parseIntensity;
exports.enforceIntensity = enforceIntensity;
const WRITE_SCOPES = new Set(['repo.write', 'fs', 'net', 'secrets']);
function parseAsBoundedNumber(raw) {
    if (raw === undefined || raw.trim() === '') {
        return null;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 3) {
        throw new Error(`AGENT_INTENSITY must be an integer between 0 and 3. Received: ${raw}`);
    }
    return value;
}
function parseIntensity(env, rawValue = process.env.AGENT_INTENSITY) {
    const explicit = parseAsBoundedNumber(rawValue);
    if (explicit !== null) {
        return explicit;
    }
    return env === 'prod' ? 0 : 1;
}
function intersectsWriteScopes(scopes) {
    return scopes.some((scope) => WRITE_SCOPES.has(scope));
}
function repoPathsAllowed(skillPaths, allowlist) {
    if (!skillPaths || skillPaths.length === 0) {
        return true;
    }
    const allowed = allowlist ?? [];
    if (allowed.length === 0) {
        return false;
    }
    return skillPaths.every((path) => allowed.some((allowedPath) => path.startsWith(allowedPath)));
}
function enforceIntensity(invocation, intensity, skillSpec) {
    if (intensity === 0 && intersectsWriteScopes(skillSpec.scopes)) {
        return {
            allow: false,
            reason: 'Intensity 0 allows read-only execution and blocks repo.write/fs/net/secrets scopes.',
        };
    }
    if (intensity === 1) {
        if (skillSpec.risk !== 'low' && skillSpec.scopes.includes('repo.write')) {
            return {
                allow: false,
                reason: 'Intensity 1 blocks repo.write for medium/high risk skills.',
            };
        }
        if (skillSpec.scopes.includes('repo.write')) {
            if (!repoPathsAllowed(skillSpec.repo_paths, invocation.allowed_repo_paths)) {
                return {
                    allow: false,
                    reason: 'Intensity 1 requires repo.write paths to be within invocation allowlist.',
                };
            }
        }
    }
    if (intensity === 3 &&
        (skillSpec.risk === 'medium' || skillSpec.risk === 'high') &&
        !(invocation.annotations?.approvals ?? []).includes('governance')) {
        return {
            allow: false,
            reason: 'Intensity 3 requires approvals:["governance"] for medium/high risk skills.',
        };
    }
    if (intensity >= 2) {
        return {
            allow: true,
            reason: 'Intensity >=2 defers to policy engine evaluation (default deny).',
        };
    }
    return {
        allow: true,
        reason: 'Allowed by capability intensity constraints.',
    };
}
