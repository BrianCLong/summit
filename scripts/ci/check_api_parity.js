"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const SPEC_PATH = 'docs/api-spec.yaml';
async function checkApiParity() {
    console.log('Checking API Parity...');
    if (!fs_1.default.existsSync(SPEC_PATH)) {
        console.error(`❌ FAIL: Spec file not found at ${SPEC_PATH}`);
        process.exit(1);
    }
    const specContent = fs_1.default.readFileSync(SPEC_PATH, 'utf8');
    const spec = js_yaml_1.default.load(specContent);
    const specPaths = Object.keys(spec.paths || {});
    // List of expected paths (in a real scenario, we would parse the route files)
    // For this sprint, we enforce that our *new* endpoints are present.
    const requiredPaths = [
        '/analytics/forecast',
        '/reports/generate',
        '/auth/login',
        '/maestro/runs'
    ];
    const missingPaths = requiredPaths.filter(p => !specPaths.includes(p));
    if (missingPaths.length > 0) {
        console.error('❌ FAIL: The following required paths are missing from OpenAPI spec:', missingPaths);
        process.exit(1);
    }
    // Check for versioning info
    if (!spec.info.version) {
        console.error('❌ FAIL: API version is missing from spec.');
        process.exit(1);
    }
    console.log('✅ PASS: API Spec parity check passed for critical paths.');
}
checkApiParity();
