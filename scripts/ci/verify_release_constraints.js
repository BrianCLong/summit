"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = __importDefault(require("path"));
const constraintsPath = path_1.default.join(process.cwd(), 'governance/constraints.yaml');
if (!fs_1.default.existsSync(constraintsPath)) {
    console.error('❌ RELEASE ABORTED: governance/constraints.yaml is missing. Cannot verify release constraints.');
    process.exit(1);
}
try {
    const constraints = js_yaml_1.default.load(fs_1.default.readFileSync(constraintsPath, 'utf8'));
    if (constraints.release?.blackout_window) {
        console.error('❌ RELEASE ABORTED: Blackout window is active.');
        process.exit(1);
    }
    console.log('✅ Release Constraints Verified: No active blackout window.');
    process.exit(0);
}
catch (error) {
    console.error('Error reading constraints:', error);
    process.exit(1);
}
