import { evaluateDependencyIntake, Dep, Denylist } from '../src/gates/dependency_intake.js';

describe('Dependency Intake Gate', () => {
  const denylist: Denylist = {
    packages: ['bad-pkg'],
    patterns: ['malicious-']
  };

  it('should pass clean dependencies', () => {
    const deps: Dep[] = [
      { name: 'react', version: '1.0.0', sourceFile: 'package.json' }
    ];
    const findings = evaluateDependencyIntake(deps, denylist);
    expect(findings).toHaveLength(0);
  });

  it('should catch denylisted packages', () => {
    const deps: Dep[] = [
      { name: 'bad-pkg', version: '1.0.0', sourceFile: 'package.json' }
    ];
    const findings = evaluateDependencyIntake(deps, denylist);
    expect(findings).toHaveLength(1);
    expect(findings[0].reason).toContain('denylisted-package');
  });

  it('should catch suspicious patterns', () => {
    const deps: Dep[] = [
      { name: 'malicious-helper', version: '1.0.0', sourceFile: 'package.json' }
    ];
    const findings = evaluateDependencyIntake(deps, denylist);
    expect(findings).toHaveLength(1);
    expect(findings[0].reason).toContain('suspicious-pattern');
  });

  it('should catch long names', () => {
    const longName = 'a'.repeat(61);
    const deps: Dep[] = [
      { name: longName, version: '1.0.0', sourceFile: 'package.json' }
    ];
    const findings = evaluateDependencyIntake(deps, denylist);
    expect(findings).toHaveLength(1);
    expect(findings[0].reason).toContain('suspicious-name-length');
  });
});
