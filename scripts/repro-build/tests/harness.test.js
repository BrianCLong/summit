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
const harness_1 = require("../harness");
const assert_1 = __importDefault(require("assert"));
const TEST_DIR = path.resolve(__dirname, 'test-workspace');
const MOCK_BUILD_SCRIPT = path.join(TEST_DIR, 'mock-build.js');
const OUTPUT_DIR = 'dist';
function setup() {
    if (fs.existsSync(TEST_DIR))
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });
}
function createMockBuildScript(isDeterministic) {
    const scriptContent = `
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '${OUTPUT_DIR}');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// File 1: Always same
fs.writeFileSync(path.join(outputDir, 'static.txt'), 'Hello World');

// File 2: Deterministic or Random
const content = ${isDeterministic} ? 'Fixed' : Math.random().toString();
fs.writeFileSync(path.join(outputDir, 'dynamic.txt'), content);
`;
    fs.writeFileSync(MOCK_BUILD_SCRIPT, scriptContent);
}
async function runTests() {
    console.log("Running Reproducible Build Harness Tests...");
    setup();
    // Test 1: Deterministic Build
    console.log("Test 1: Deterministic Build");
    createMockBuildScript(true);
    const result1 = (0, harness_1.runHarness)({
        buildCommand: `node ${MOCK_BUILD_SCRIPT}`,
        outputDir: OUTPUT_DIR,
        cwd: TEST_DIR
    });
    assert_1.default.strictEqual(result1.success, true, "Expected deterministic build to pass");
    assert_1.default.strictEqual(result1.report.length, 0);
    console.log("PASS");
    // Test 2: Non-Deterministic Build
    console.log("Test 2: Non-Deterministic Build");
    createMockBuildScript(false);
    const result2 = (0, harness_1.runHarness)({
        buildCommand: `node ${MOCK_BUILD_SCRIPT}`,
        outputDir: OUTPUT_DIR,
        cwd: TEST_DIR
    });
    assert_1.default.strictEqual(result2.success, false, "Expected non-deterministic build to fail");
    assert_1.default.ok(result2.report.some(r => r.includes('Content mismatch: dynamic.txt')), "Expected report to mention dynamic.txt");
    console.log("PASS");
    // Cleanup
    if (fs.existsSync(TEST_DIR))
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
runTests().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
