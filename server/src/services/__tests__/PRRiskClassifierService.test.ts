import { PRRiskClassifierService } from '../PRRiskClassifierService';

describe('PRRiskClassifierService', () => {
  let service: PRRiskClassifierService;

  beforeEach(() => {
    service = new PRRiskClassifierService();
  });

  it('should classify schema changes as HIGH risk', () => {
    const files = ['server/src/db/schema.prisma', 'server/src/db/migrations/001_init.sql'];
    const result = service.classify(files);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.categories).toContain('SCHEMA');
    expect(result.reasons).toHaveLength(2);
  });

  it('should classify security changes as HIGH risk', () => {
    const files = ['server/src/middleware/auth.ts', 'package.json'];
    const result = service.classify(files);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.categories).toContain('SECURITY');
  });

  it('should classify infra changes as HIGH risk', () => {
    const files = ['Dockerfile', 'k8s/deployment.yaml'];
    const result = service.classify(files);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.categories).toContain('INFRA');
  });

  it('should classify UX changes as LOW risk', () => {
    const files = ['apps/web/src/components/Button.tsx', 'apps/web/src/styles.css'];
    const result = service.classify(files);
    expect(result.riskLevel).toBe('LOW');
    expect(result.categories).toContain('UX');
  });

  it('should classify backend logic changes as MEDIUM risk', () => {
    const files = ['server/src/services/UserService.ts'];
    const result = service.classify(files);
    expect(result.riskLevel).toBe('MEDIUM');
    expect(result.categories).toContain('LOGIC');
  });

  it('should handle mixed changes (Schema + UX) as HIGH risk', () => {
    const files = ['server/src/db/schema.sql', 'apps/web/src/components/Button.tsx'];
    const result = service.classify(files);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.categories).toContain('SCHEMA');
    expect(result.categories).toContain('UX');
  });

  it('should classify unknown/doc files as LOW risk', () => {
    const files = ['README.md', 'docs/API.md'];
    const result = service.classify(files);
    expect(result.riskLevel).toBe('LOW');
    expect(result.categories).toContain('UNKNOWN');
  });
});
