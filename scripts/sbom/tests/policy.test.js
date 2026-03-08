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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const policy_1 = require("../policy");
const assert_1 = __importDefault(require("assert"));
const FIXTURE_DIR = path.resolve(__dirname, 'fixtures');
const SBOM_BAD = path.join(FIXTURE_DIR, 'sbom-bad.json');
const SBOM_GOOD = path.join(FIXTURE_DIR, 'sbom-good.json');
// Ensure fixture dir exists
if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}
// Write a bad SBOM
const badSbom = {
    components: [
        {
            name: "malicious-lib",
            version: "6.6.6",
            licenses: [
                { license: { id: "GPL-3.0" } }
            ],
            purl: "pkg:npm/malicious-lib@6.6.6"
        },
        {
            name: "incomplete-lib",
            // missing version
        }
    ]
};
fs.writeFileSync(SBOM_BAD, JSON.stringify(badSbom, null, 2));
// Write a good SBOM
const goodSbom = {
    components: [
        {
            name: "safe-lib",
            version: "1.0.0",
            licenses: [
                { license: { id: "MIT" } }
            ],
            purl: "pkg:npm/safe-lib@1.0.0"
        }
    ]
};
fs.writeFileSync(SBOM_GOOD, JSON.stringify(goodSbom, null, 2));
async function runTests() {
    console.log("Running SBOM Policy Tests...");
    // Test Bad SBOM
    console.log("Test: Should fail on bad SBOM");
    process.env.SBOM_FILE_PATH = SBOM_BAD;
    const failResult = (0, policy_1.checkPolicy)(false);
    assert_1.default.strictEqual(failResult, false, "Expected bad SBOM to fail policy check");
    console.log("PASS");
    // Test Good SBOM
    console.log("Test: Should pass on good SBOM");
    process.env.SBOM_FILE_PATH = SBOM_GOOD;
    const passResult = (0, policy_1.checkPolicy)(false);
    assert_1.default.strictEqual(passResult, true, "Expected good SBOM to pass policy check");
    console.log("PASS");
}
runTests().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
