import { analyzeBundle } from '../src/analyzer';
import { evidenceIdFromBytes } from '../src/evidence';

const sampleBundle = {
  id: "test-bundle",
  items: [
    {
      type: "article",
      text: "Regular news.",
      source_meta: { domain: "example.com" }
    }
  ]
};

const abuseBundle = {
  id: "abuse-bundle",
  items: [
    {
      type: "article",
      text: "Contact me at user@example.com for more info.",
      source_meta: { domain: "example.com" }
    }
  ]
};

describe('Disinfo Analyzer', () => {
  it('analyzes benign bundle', async () => {
    const evidenceId = evidenceIdFromBytes(Buffer.from(JSON.stringify(sampleBundle)));
    const report = await analyzeBundle(sampleBundle, evidenceId);
    expect(report.risk_score).toBeLessThan(0.3);
  });

  it('detects missing provenance', async () => {
    const bundle = {
       items: [{ type: "image", metadata: { c2pa: null } }]
    };
    const report = await analyzeBundle(bundle, "evd-1");
    expect(report.signals.provenance.has_missing_credentials).toBe(true);
    expect(report.risk_score).toBeGreaterThanOrEqual(0.4);
  });

  it('does not leak PII in logs (mock check)', async () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      await analyzeBundle(abuseBundle, "evd-2");
      expect(spy).not.toHaveBeenCalledWith(expect.stringMatching(/@example.com/));
      spy.mockRestore();
  });

  it('sanitizes input text', async () => {
    const maliciousBundle = {
        id: 'malicious',
        items: [{ type: 'article', text: 'SHOC<b>KING</b>' }]
    };
    const report = await analyzeBundle(maliciousBundle, 'evd-3');
    expect(report.signals.content.sensationalism_score).toBe(1);
  });
});
