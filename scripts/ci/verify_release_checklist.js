"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyReleaseChecklist = verifyReleaseChecklist;
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const CHECKLIST_PATH = 'governance/release_checklist.yaml';
function verifyReleaseChecklist() {
    console.log(`\n📋 Verifying Release Checklist (${CHECKLIST_PATH})...`);
    if (!fs_1.default.existsSync(CHECKLIST_PATH)) {
        console.error(`❌ Checklist file not found: ${CHECKLIST_PATH}`);
        return false;
    }
    try {
        const content = fs_1.default.readFileSync(CHECKLIST_PATH, 'utf8');
        const doc = js_yaml_1.default.load(content);
        if (!doc.checklist || !Array.isArray(doc.checklist)) {
            console.error(`❌ Invalid checklist: 'checklist' missing or not an array.`);
            return false;
        }
        console.log(`   Found ${doc.checklist.length} checklist items.`);
        for (const item of doc.checklist) {
            if (!item.id || !item.description) {
                console.error(`❌ Invalid item: missing id or description`, item);
                return false;
            }
        }
        console.log('✅ Release Checklist is valid.');
        return true;
    }
    catch (e) {
        console.error(`❌ Failed to parse checklist:`, e);
        return false;
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    if (!verifyReleaseChecklist()) {
        process.exit(1);
    }
}
