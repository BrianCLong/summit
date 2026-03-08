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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
describe('Scaffolder Conformance', () => {
    let generateScaffold;
    const testDir = path.resolve(process.cwd(), 'tests', 'infra', 'fixtures', 'scaffold-test');
    beforeAll(async () => {
        const mod = await Promise.resolve().then(() => __importStar(require('../../src/platform/infra/scaffolder')));
        generateScaffold = mod.generateScaffold;
        // Clean up if exists
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });
    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });
    it('should fail scaffolding if required metadata is missing', () => {
        const componentConfig = {
            name: 'new-service',
            // missing owner and tags
        };
        expect(() => {
            generateScaffold(testDir, componentConfig);
        }).toThrow('Missing required metadata: owner');
    });
    it('should emit required files in successful scaffold', () => {
        const componentConfig = {
            name: 'valid-service',
            owner: 'billing-team',
            tags: ['java', 'spring']
        };
        generateScaffold(testDir, componentConfig);
        const serviceYamlPath = path.join(testDir, 'service.yaml');
        const workflowPath = path.join(testDir, '.github', 'workflows', 'ci-core.yml');
        expect(fs.existsSync(serviceYamlPath)).toBe(true);
        expect(fs.existsSync(workflowPath)).toBe(true);
        const serviceYaml = fs.readFileSync(serviceYamlPath, 'utf8');
        expect(serviceYaml).toContain('name: valid-service');
        expect(serviceYaml).toContain('owner: billing-team');
    });
});
