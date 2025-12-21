import { htmlToPdf } from '../../src/pdf';

test('renders HTML to PDF bytes containing text', async () => {
  const buf = await htmlToPdf('<h1>Case</h1><p>Details &amp; timeline</p>');
  const text = buf.toString('utf8');
  expect(text.startsWith('%PDF')).toBe(true);
  expect(text.includes('Case')).toBe(true);
  expect(text.includes('Details & timeline')).toBe(true);
});

test('rejects empty input', async () => {
  await expect(htmlToPdf('   ')).rejects.toThrow('html_required');
});
