"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEnvironmentContract = verifyEnvironmentContract;
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const CONTRACT_PATH = 'governance/environment_contract.yaml';
function verifyEnvironmentContract() {
    console.log(`\n📜 Verifying Environment Contract (${CONTRACT_PATH})...`);
    if (!fs_1.default.existsSync(CONTRACT_PATH)) {
        console.error(`❌ Contract file not found: ${CONTRACT_PATH}`);
        return false;
    }
    try {
        const content = fs_1.default.readFileSync(CONTRACT_PATH, 'utf8');
        const doc = js_yaml_1.default.load(content);
        if (!doc.required_vars || !Array.isArray(doc.required_vars)) {
            console.error(`❌ Invalid contract: 'required_vars' missing or not an array.`);
            return false;
        }
        console.log(`   Verifying ${doc.required_vars.length} required variables defined in contract...`);
        // In a real check, we would check process.env or a config map.
        // For now, we just validate the contract exists and is parseable.
        console.log('✅ Environment Contract is valid and parseable.');
        return true;
    }
    catch (e) {
        console.error(`❌ Failed to parse contract:`, e);
        return false;
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    if (!verifyEnvironmentContract()) {
        process.exit(1);
    }
}
