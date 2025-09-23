import { generateHuntReport } from '../reports/HuntReport';

test('removes PII from results', () => {
  const md = generateHuntReport({ results: [{ name: 'Alice', email: 'a@b.com', value: 1 }] });
  expect(md).not.toMatch('Alice');
  expect(md).not.toMatch('a@b.com');
});
