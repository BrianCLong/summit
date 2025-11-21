import { BrandingEngine } from '../branding/branding-engine.js';
import { SampleCountries } from '../utils/sample-countries.js';

describe('BrandingEngine', () => {
  const engine = new BrandingEngine();

  describe('generateBranding', () => {
    it('should generate branding for Malta', () => {
      const branding = engine.generateBranding(SampleCountries.MT);

      expect(branding.countryCode).toBe('MT');
      expect(branding.prefix).toBe('m-');
      expect(branding.primaryColor).toBe('#CF142B');
      expect(branding.rtlSupport).toBe(false);
    });

    it('should enable RTL for UAE (Arabic)', () => {
      const branding = engine.generateBranding(SampleCountries.AE);

      expect(branding.rtlSupport).toBe(true);
    });

    it('should use default branding for unknown countries', () => {
      const unknownCountry = {
        ...SampleCountries.MT,
        code: 'XX',
        name: 'Unknown',
      };

      const branding = engine.generateBranding(unknownCountry);

      expect(branding.prefix).toBe('xx-');
      expect(branding.primaryColor).toBe('#0066CC');
    });
  });

  describe('generateServiceNames', () => {
    it('should transform Estonian service names to country-specific', () => {
      const branding = engine.generateBranding(SampleCountries.MT);
      const names = engine.generateServiceNames(
        ['e-Tax', 'X-Road', 'Smart-ID'],
        branding,
      );

      expect(names.get('e-Tax')).toBe('m-Tax');
      expect(names.get('X-Road')).toBe('Malta-Road');
      expect(names.get('Smart-ID')).toBe('m-ID');
    });
  });

  describe('generateThemeCSS', () => {
    it('should generate valid CSS with country colors', () => {
      const branding = engine.generateBranding(SampleCountries.SG);
      const css = engine.generateThemeCSS(branding);

      expect(css).toContain('--color-primary: #EF3340');
      expect(css).toContain('Singapore');
    });

    it('should include RTL rules for RTL countries', () => {
      const branding = engine.generateBranding(SampleCountries.AE);
      const css = engine.generateThemeCSS(branding);

      expect(css).toContain('[dir="rtl"]');
      expect(css).toContain('direction: rtl');
    });
  });
});
