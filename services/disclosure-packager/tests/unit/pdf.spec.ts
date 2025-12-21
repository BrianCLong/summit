import { htmlToPdf } from '../../src/pdf';

test('returns a PDF buffer', async () => {
  const buf = await htmlToPdf('<h1>Report</h1><p>Hello</p>');
  const text = buf.toString('latin1');
  expect(text.startsWith('%PDF')).toBe(true);
  expect(text).toContain('Hello');
});
