import { sanitizeForMarkdown, stripHtml } from '../../src/connectors/platform-watch/normalize';

describe('platform-watch normalization', () => {
  it('strips script tags and html', () => {
    const input = '<script>alert(1)</script>Alpha <b>Beta</b>';
    const stripped = stripHtml(input);
    expect(stripped).toBe('Alpha Beta');
  });

  it('escapes angle brackets for markdown safety', () => {
    const input = 'Hello <script>alert(1)</script> world';
    const sanitized = sanitizeForMarkdown(input);
    expect(sanitized).toBe('Hello &lt;script&gt;alert(1)&lt;/script&gt; world');
  });
});
