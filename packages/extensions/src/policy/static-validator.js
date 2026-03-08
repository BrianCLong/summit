"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticPolicyValidator = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class StaticPolicyValidator {
    allowList;
    denyList;
    constructor(options = {}) {
        this.allowList = new Set(options.dependencyAllowList || []);
        this.denyList = new Set(options.dependencyDenyList || []);
    }
    async validate(manifest, extensionPath) {
        await this.validateDependencies(manifest);
        await this.validateLockfile(extensionPath);
    }
    async validateDependencies(manifest) {
        const dependencies = Object.keys(manifest.dependencies || {});
        const peerDependencies = Object.keys(manifest.peerDependencies || {});
        const all = [...dependencies, ...peerDependencies];
        for (const dep of all) {
            if (this.denyList.has(dep)) {
                throw new Error(`Dependency ${dep} is blocked by policy`);
            }
            if (this.allowList.size > 0 && !this.allowList.has(dep)) {
                throw new Error(`Dependency ${dep} is not in the allowed list`);
            }
        }
    }
    async validateLockfile(extensionPath) {
        const lockfile = path.join(extensionPath, 'pnpm-lock.yaml');
        const packageLock = path.join(extensionPath, 'package-lock.json');
        const yarnLock = path.join(extensionPath, 'yarn.lock');
        const exists = await Promise.all([
            this.exists(lockfile),
            this.exists(packageLock),
            this.exists(yarnLock),
        ]);
        if (exists.some((value) => value)) {
            return;
        }
        throw new Error('Extension must include a lockfile for deterministic installs');
    }
    async exists(target) {
        try {
            await fs.access(target);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.StaticPolicyValidator = StaticPolicyValidator;
