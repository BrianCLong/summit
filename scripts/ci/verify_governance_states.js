"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const registryPath = path_1.default.join(process.cwd(), 'governance/registry.json');
if (!fs_1.default.existsSync(registryPath)) {
    console.error('❌ Registry not found. Run generate_registry.ts first.');
    process.exit(1);
}
const registry = JSON.parse(fs_1.default.readFileSync(registryPath, 'utf-8'));
let failed = false;
// Simulated environment check (e.g., if we are in production)
const isProduction = process.env.NODE_ENV === 'production' || process.env.CI_BRANCH === 'main';
console.log(`Verifying ${registry.artifacts.length} artifacts... (Env: ${isProduction ? 'PROD' : 'DEV'})`);
for (const artifact of registry.artifacts) {
    if (isProduction && artifact.state === 'draft') {
        console.error(`❌ Artifact ${artifact.name} is in DRAFT state in production environment.`);
        failed = true;
    }
    if (artifact.state === 'retired') {
        console.warn(`⚠️ Artifact ${artifact.name} is RETIRED.`);
    }
}
if (failed) {
    process.exit(1);
}
console.log('✅ Governance State Verification Passed');
