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
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const validateScript = path.resolve(process.cwd(), 'ci/schema_validate.sh');
const ufarSchema = path.resolve(process.cwd(), 'schemas/ufar.schema.json');
const tempDir = path.resolve(process.cwd(), 'tests/schema/temp');
function setup() {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
}
function teardown() {
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
function createJsonFile(name, content) {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    return filePath;
}
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}
async function runTests() {
    console.log('Running UFAR schema required fields tests...');
    setup();
    try {
        // Test: Missing uncertainty
        const file1 = createJsonFile('missing_uncertainty.json', {
            known_unknowns: [],
            assumptions: [],
            validation_plan: []
        });
        try {
            (0, child_process_1.execSync)(`${validateScript} ${file1} ${ufarSchema}`);
            throw new Error('Should have failed validation');
        }
        catch (e) {
            assert(e.status !== 0, 'Should fail when uncertainty is missing');
        }
        // Test: Missing validation_plan
        const file2 = createJsonFile('missing_validation_plan.json', {
            uncertainty: { epistemic: 0.1, aleatoric: 0.1 },
            known_unknowns: [],
            assumptions: []
        });
        try {
            (0, child_process_1.execSync)(`${validateScript} ${file2} ${ufarSchema}`);
            throw new Error('Should have failed validation');
        }
        catch (e) {
            assert(e.status !== 0, 'Should fail when validation_plan is missing');
        }
        // Test: Valid UFAR
        const file3 = createJsonFile('valid_ufar.json', {
            uncertainty: { epistemic: 0.1, aleatoric: 0.1 },
            known_unknowns: ["unknown1"],
            assumptions: ["assumption1"],
            validation_plan: ["plan1"]
        });
        const output3 = (0, child_process_1.execSync)(`${validateScript} ${file3} ${ufarSchema}`).toString();
        assert(output3.includes('PASSED'), 'Should pass valid UFAR');
        console.log('All UFAR schema tests PASSED.');
    }
    finally {
        teardown();
    }
}
runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
