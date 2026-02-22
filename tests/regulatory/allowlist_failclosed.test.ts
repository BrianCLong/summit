import allowlistData from '../../cli/src/lib/regulatory/sources/allowlist.json';

describe('Regulatory Allowlist', () => {
    const allowlist = allowlistData as { domains: string[] };

    it('should contain required domains', () => {
        expect(allowlist.domains).toContain('digital-strategy.ec.europa.eu');
        expect(allowlist.domains).toContain('fedramp.gov');
    });

    it('should NOT contain arbitrary domains', () => {
        expect(allowlist.domains).not.toContain('evil.com');
    });
});
