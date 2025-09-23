import fs from 'fs';
import path from 'path';
import { exportCase } from '../cases/Export';
import { Case } from '../graphql/resolvers/cases';

describe('case export', () => {
  it('writes sanitized json with hashes', () => {
    const c: Case = {
      id: '1',
      title: 't',
      status: 'open',
      priority: 'p',
      severity: 's',
      assignees: [],
      tags: [],
      createdAt: '',
      updatedAt: '',
      alerts: [],
      evidence: [{ id: 'e1', name: 'n', mime: 'text/plain', sha256: 'abc', size: 1, addedAt: '' }],
      triageScore: 0
    };
    const dir = path.join(__dirname, 'out');
    exportCase(c, dir);
    const content = fs.readFileSync(path.join(dir, '1.json'), 'utf8');
    expect(content).toContain('abc');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
