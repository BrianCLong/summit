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
const node_test_1 = require("node:test");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const assert = __importStar(require("assert"));
const REPO_ROOT = process.cwd();
(0, node_test_1.describe)('V2 Charter Verification', () => {
    (0, node_test_1.it)('1. V2 Code Paths are Isolated (Sandbox exists and is distinct)', () => {
        const sandboxPath = path.join(REPO_ROOT, 'packages', 'v2-sandbox');
        assert.ok(fs.existsSync(sandboxPath), 'packages/v2-sandbox must exist');
        const readmePath = path.join(sandboxPath, 'README.md');
        assert.ok(fs.existsSync(readmePath), 'Sandbox must have a README defining isolation');
        const readmeContent = fs.readFileSync(readmePath, 'utf-8');
        assert.ok(readmeContent.includes('Isolation Rules'), 'Sandbox README must define Isolation Rules');
    });
    (0, node_test_1.it)('2. Inherited Contracts are Enforced (List exists)', () => {
        const contractsPath = path.join(REPO_ROOT, 'docs', 'v2', 'INHERITED_CONTRACTS.md');
        assert.ok(fs.existsSync(contractsPath), 'INHERITED_CONTRACTS.md must exist');
        const content = fs.readFileSync(contractsPath, 'utf-8');
        assert.ok(content.includes('docs/GOVERNANCE.md'), 'Must reference GOVERNANCE.md');
        assert.ok(content.includes('SECURITY.md'), 'Must reference SECURITY.md');
    });
    (0, node_test_1.it)('3. Change Class Declaration is Documented', () => {
        const classesPath = path.join(REPO_ROOT, 'docs', 'v2', 'CHANGE_CLASSES.md');
        assert.ok(fs.existsSync(classesPath), 'CHANGE_CLASSES.md must exist');
        const content = fs.readFileSync(classesPath, 'utf-8');
        assert.ok(content.includes('Class A'), 'Must define Class A');
        assert.ok(content.includes('Class B'), 'Must define Class B');
        assert.ok(content.includes('Class C'), 'Must define Class C');
    });
    (0, node_test_1.it)('4. Charter Exists and Defines Mission', () => {
        const charterPath = path.join(REPO_ROOT, 'docs', 'v2', 'CHARTER.md');
        assert.ok(fs.existsSync(charterPath), 'CHARTER.md must exist');
        const content = fs.readFileSync(charterPath, 'utf-8');
        assert.ok(content.includes('Mission Statement'), 'Charter must have a Mission Statement');
        assert.ok(content.includes('Non-Goals'), 'Charter must have Non-Goals');
    });
    (0, node_test_1.it)('5. Governance Extensions Exist', () => {
        const govPath = path.join(REPO_ROOT, 'docs', 'v2', 'GOVERNANCE_EXTENSIONS.md');
        assert.ok(fs.existsSync(govPath), 'GOVERNANCE_EXTENSIONS.md must exist');
    });
});
