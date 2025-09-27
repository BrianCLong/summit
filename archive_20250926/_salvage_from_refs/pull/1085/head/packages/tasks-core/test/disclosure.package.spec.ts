import fs from 'node:fs';
import task from '../src/ops/disclosure.package.js';

test('packages files with manifest', async () => {
  fs.writeFileSync('tmp.txt', 'hello');
  const res = await task.execute({} as any, { payload: { files: ['tmp.txt'], outPath: 'bundle.zip' } });
  expect(res.payload.bundle).toBe('bundle.zip');
  expect(res.payload.manifest[0].path).toBe('tmp.txt');
});
