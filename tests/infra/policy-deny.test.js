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
describe('Policy Deny-by-default behavior', () => {
    let validateArtifact;
    let FLAGS;
    beforeAll(async () => {
        const mod = await Promise.resolve().then(() => __importStar(require('../../src/platform/infra/validate')));
        const flagsMod = await Promise.resolve().then(() => __importStar(require('../../src/platform/infra/flags')));
        validateArtifact = mod.validateArtifact;
        FLAGS = flagsMod.FLAGS;
    });
    it('should require a known policy profile for deployment', () => {
        const artifact = {
            kind: 'stack',
            name: 'app-prod',
            version: '1.0.0',
            owner: { team: 'product-auth' }
        };
        if (FLAGS.INFRA_POLICY_ENFORCE) {
            const result = validateArtifact(artifact);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Unknown or missing policy profile');
        }
    });
    it('should pass if policy profile is present', () => {
        const artifact = {
            kind: 'stack',
            name: 'app-prod',
            version: '1.0.0',
            owner: { team: 'product-auth' },
            policy_profile: 'baseline'
        };
        if (FLAGS.INFRA_POLICY_ENFORCE) {
            const result = validateArtifact(artifact);
            expect(result.valid).toBe(true);
            expect(result.errors).not.toContain('Unknown or missing policy profile');
        }
    });
});
