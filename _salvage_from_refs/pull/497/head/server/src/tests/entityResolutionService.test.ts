import { EntityResolutionService } from '../services/EntityResolutionService.js';

describe('EntityResolutionService', () => {
  const svc = new EntityResolutionService();

  it('generates deterministic canonical ids', () => {
    const a = svc.generateCanonicalId({
      name: 'Alice Smith',
      email: 'alice@example.com',
      url: 'https://Example.com/profile',
    });
    const b = svc.generateCanonicalId({
      name: ' alice smith ',
      email: 'Alice@Example.com',
      url: 'http://example.com/profile',
    });
    expect(a).toBe(b);
  });

  it('returns empty string when insufficient data', () => {
    const id = svc.generateCanonicalId({});
    expect(id).toBe('');
  });
});
