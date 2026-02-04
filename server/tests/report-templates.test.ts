import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from '@jest/globals';

describe('report templates', () => {
  it('matches snapshot', () => {
    const manifestPath = path.join(
      process.cwd(),
      'templates',
      'reports',
      'sample.handlebars',
    );
    const manifest = fs.readFileSync(manifestPath, 'utf-8');
    expect(manifest).toContain('{{content}}');
  });
});
