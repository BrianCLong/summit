import { casKey } from './cas_key';
test('key changes when file content changes', () => {
  const a = casKey({
    files: ['server/src/app.ts'],
    node: '18',
    pnpm: '9',
    jest: '29',
    env: {},
  });
  // simulate change with different env
  const b = casKey({
    files: ['server/src/app.ts'],
    node: '18',
    pnpm: '9',
    jest: '29',
    env: { FOO: '1' },
  });
  expect(a).not.toEqual(b);
});
