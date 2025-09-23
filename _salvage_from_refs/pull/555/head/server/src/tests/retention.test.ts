import { RetentionService } from '../services/RetentionService.js';
import fs from 'fs';
import path from 'path';

describe('RetentionService', () => {
  const configPath = path.join(__dirname, '../../config/retention/policies.yaml');
  it('returns tenant specific days', () => {
    const svc = new RetentionService(configPath);
    expect(svc.getRetentionDays('demo')).toBe(30);
  });

  it('falls back to default', () => {
    const svc = new RetentionService(configPath);
    expect(svc.getRetentionDays('unknown')).toBe(90);
  });
});
