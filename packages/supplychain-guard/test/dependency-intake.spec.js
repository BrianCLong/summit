"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dependency_intake_js_1 = require("../src/gates/dependency_intake.js");
describe('Dependency Intake Gate', () => {
    const denylist = {
        packages: ['bad-pkg'],
        patterns: ['malicious-']
    };
    it('should pass clean dependencies', () => {
        const deps = [
            { name: 'react', version: '1.0.0', sourceFile: 'package.json' }
        ];
        const findings = (0, dependency_intake_js_1.evaluateDependencyIntake)(deps, denylist);
        expect(findings).toHaveLength(0);
    });
    it('should catch denylisted packages', () => {
        const deps = [
            { name: 'bad-pkg', version: '1.0.0', sourceFile: 'package.json' }
        ];
        const findings = (0, dependency_intake_js_1.evaluateDependencyIntake)(deps, denylist);
        expect(findings).toHaveLength(1);
        expect(findings[0].reason).toContain('denylisted-package');
    });
    it('should catch suspicious patterns', () => {
        const deps = [
            { name: 'malicious-helper', version: '1.0.0', sourceFile: 'package.json' }
        ];
        const findings = (0, dependency_intake_js_1.evaluateDependencyIntake)(deps, denylist);
        expect(findings).toHaveLength(1);
        expect(findings[0].reason).toContain('suspicious-pattern');
    });
    it('should catch long names', () => {
        const longName = 'a'.repeat(61);
        const deps = [
            { name: longName, version: '1.0.0', sourceFile: 'package.json' }
        ];
        const findings = (0, dependency_intake_js_1.evaluateDependencyIntake)(deps, denylist);
        expect(findings).toHaveLength(1);
        expect(findings[0].reason).toContain('suspicious-name-length');
    });
});
