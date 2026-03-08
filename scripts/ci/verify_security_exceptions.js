"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySecurityExceptions = verifySecurityExceptions;
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const EXCEPTIONS_PATH = 'governance/security_exceptions.yaml';
function verifySecurityExceptions() {
    console.log(`\n🛡️  Verifying Security Exceptions (${EXCEPTIONS_PATH})...`);
    if (!fs_1.default.existsSync(EXCEPTIONS_PATH)) {
        console.log(`   No exceptions file found. Assuming no exceptions.`);
        return true;
    }
    try {
        const content = fs_1.default.readFileSync(EXCEPTIONS_PATH, 'utf8');
        const doc = js_yaml_1.default.load(content);
        if (!doc.exceptions || !Array.isArray(doc.exceptions)) {
            console.error(`❌ Invalid exceptions file: 'exceptions' missing or not an array.`);
            return false;
        }
        const now = new Date();
        let hasFailures = false;
        console.log(`   Checking ${doc.exceptions.length} exceptions...`);
        for (const item of doc.exceptions) {
            if (!item.expires) {
                console.error(`❌ Exception ${item.id} missing expiration date.`);
                hasFailures = true;
                continue;
            }
            const expires = new Date(item.expires);
            if (expires < now) {
                console.error(`❌ Exception ${item.id} EXPIRED on ${item.expires}. Description: ${item.description}`);
                hasFailures = true;
            }
        }
        if (hasFailures) {
            return false;
        }
        console.log('✅ All security exceptions are valid (not expired).');
        return true;
    }
    catch (e) {
        console.error(`❌ Failed to parse exceptions file:`, e);
        return false;
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    if (!verifySecurityExceptions()) {
        process.exit(1);
    }
}
