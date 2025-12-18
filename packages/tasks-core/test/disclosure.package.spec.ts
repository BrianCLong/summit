import fs from 'node:fs';
import path from 'node:path';
import task from '../src/ops/disclosure.package.js';
import { sha256 } from '../src/util/hash.js';

test('packages redacted recipient-specific disclosure views with manifest', async () => {
  const caseFile = path.join(process.cwd(), 'tmp-case.txt');
  const legalFile = path.join(process.cwd(), 'tmp-legal.txt');
  fs.writeFileSync(caseFile, 'Case 12345 belongs to Alice.');
  fs.writeFileSync(legalFile, 'Legal memo for internal review.');

  const res = await task.execute({} as any, {
    payload: {
      evidence: [
        {
          path: caseFile,
          classification: { level: 'CONFIDENTIAL', caveats: ['PII'] },
          recipients: ['analyst', 'legal'],
        },
        {
          path: legalFile,
          classification: { level: 'OFFICIAL' },
          recipients: ['legal'],
        },
      ],
      classification: { level: 'CUI', caveats: ['SP-HOUSE'] },
      recipients: ['analyst', 'legal'],
      redactions: [
        { id: 'mask-ids', pattern: '\\d{5}', replacement: '[REDACTED]', appliesTo: ['analyst'] },
        { id: 'mask-names', pattern: 'Alice', replacement: '[NAME]', appliesTo: ['analyst'] },
      ],
      outPath: path.join(process.cwd(), 'bundle.zip'),
      banner: 'Disclosure: Sensitive evidence bundle',
    },
  });

  const manifest = res.payload.manifest;
  expect(res.payload.bundle.endsWith('bundle.zip')).toBe(true);
  expect(manifest.classification.level).toBe('CUI');
  expect(manifest.redactionRules).toHaveLength(2);
  expect(manifest.views).toHaveLength(2);

  const analystView = manifest.views.find((view) => view.recipient === 'analyst');
  const legalView = manifest.views.find((view) => view.recipient === 'legal');

  expect(analystView?.files).toHaveLength(1);
  expect(analystView?.files[0].appliedRedactions).toEqual(['mask-ids', 'mask-names']);
  expect(analystView?.files[0].sha256).toBe(
    sha256('Case [REDACTED] belongs to [NAME].'),
  );

  expect(legalView?.files).toHaveLength(2);
  expect(legalView?.files[0].appliedRedactions).toEqual([]);
  expect(legalView?.files[0].sha256).toBe(sha256('Case 12345 belongs to Alice.'));
  expect(legalView?.files[1].sha256).toBe(
    sha256('Legal memo for internal review.'),
  );

  fs.unlinkSync(caseFile);
  fs.unlinkSync(legalFile);
  fs.unlinkSync(res.payload.bundle);
});
