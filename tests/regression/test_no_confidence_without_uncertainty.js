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
describe('CI Gate: No Confidence Without Uncertainty', () => {
    const gateScript = path.resolve(process.cwd(), 'ci/no_confidence_without_uncertainty.sh');
    const tempDir = path.resolve(process.cwd(), 'tests/regression/temp');
    beforeAll(() => {
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
    });
    afterAll(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    function createJsonFile(name, content) {
        const filePath = path.join(tempDir, name);
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        return filePath;
    }
    test('should PASS when no confidence field is present', () => {
        const file = createJsonFile('no_confidence.json', { foo: 'bar' });
        const output = (0, child_process_1.execSync)(`${gateScript} ${file}`).toString();
        expect(output).toContain('PASSED');
    });
    test('should PASS when confidence and uncertainty fields are present', () => {
        const file = createJsonFile('valid_ufar.json', {
            confidence: 0.8,
            uncertainty: {
                epistemic: 0.2,
                aleatoric: 0.1
            }
        });
        const output = (0, child_process_1.execSync)(`${gateScript} ${file}`).toString();
        expect(output).toContain('PASSED');
    });
    test('should FAIL when confidence is present but uncertainty is missing', () => {
        const file = createJsonFile('invalid_ufar.json', {
            confidence: 0.8
        });
        try {
            (0, child_process_1.execSync)(`${gateScript} ${file}`);
            fail('Should have failed');
        }
        catch (error) {
            expect(error.status).toBe(1);
            expect(error.stdout.toString()).toContain('FAILED');
        }
    });
    test('should FAIL when confidence is present but epistemic uncertainty is missing', () => {
        const file = createJsonFile('invalid_ufar_no_epistemic.json', {
            confidence: 0.8,
            uncertainty: {
                aleatoric: 0.1
            }
        });
        try {
            (0, child_process_1.execSync)(`${gateScript} ${file}`);
            fail('Should have failed');
        }
        catch (error) {
            expect(error.status).toBe(1);
            expect(error.stdout.toString()).toContain('FAILED');
        }
    });
    test('should PASS for valid Hypothesis Ledger', () => {
        const file = createJsonFile('valid_ledger.json', {
            hypotheses: [
                {
                    hypothesisId: 'H1',
                    statement: 'Test',
                    status: 'ACTIVE',
                    confidence: 0.9,
                    uncertainty: { epistemic: 0.1, aleatoric: 0.05 },
                    evidenceLinks: []
                }
            ]
        });
        const output = (0, child_process_1.execSync)(`${gateScript} ${file}`).toString();
        expect(output).toContain('PASSED');
    });
    test('should FAIL for Hypothesis Ledger with missing uncertainty', () => {
        const file = createJsonFile('invalid_ledger.json', {
            hypotheses: [
                {
                    hypothesisId: 'H1',
                    statement: 'Test',
                    status: 'ACTIVE',
                    confidence: 0.9,
                    evidenceLinks: []
                }
            ]
        });
        try {
            (0, child_process_1.execSync)(`${gateScript} ${file}`);
            fail('Should have failed');
        }
        catch (error) {
            expect(error.status).toBe(1);
            expect(error.stdout.toString()).toContain('FAILED');
        }
    });
});
