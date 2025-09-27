import fs from 'node:fs';
import path from 'node:path';
import { redactionService } from '../../server/src/redaction/redact';

describe('Angleton/Harel redaction rules', () => {
  const angleton = JSON.parse(fs.readFileSync(path.resolve('server/redaction/rules/angleton.json'), 'utf8'));
  const harel = JSON.parse(fs.readFileSync(path.resolve('server/redaction/rules/harel.json'), 'utf8'));
  const sample = {
    email: 'user@example.com',
    phone: '+1-555-867-5309',
    apiKey: 'sk_live_secret',
    notes: 'private incident details',
    context: { address: '10 Downing St', geo: '51.5034,-0.1276' }
  };

  it('angleton masks PII and secrets', async () => {
    const red = await redactionService.redactObject(sample, angleton as any, 't0');
    expect(red.email).not.toContain('@');
    expect(red.phone).toMatch(/\*|\#/);
    expect(red.apiKey).toMatch(/\*|\#/);
  });

  it('harel coarsens geo and hides notes', async () => {
    const red = await redactionService.redactObject(sample, harel as any, 't0');
    expect(typeof red.context.geo).toBe('string');
    expect(red.notes).not.toEqual(sample.notes);
  });
});

