import { PackageGenerator } from '../exporters/package-generator.js';
import { SampleCountries } from '../utils/sample-countries.js';

describe('PackageGenerator', () => {
  const generator = new PackageGenerator();

  describe('generatePackage', () => {
    it('should generate a complete package for Malta', async () => {
      const pkg = await generator.generatePackage(SampleCountries.MT);

      expect(pkg.id).toBeDefined();
      expect(pkg.name).toContain('Malta');
      expect(pkg.services.length).toBeGreaterThan(0);
      expect(pkg.totalCost).toBeGreaterThan(0);
      expect(pkg.totalDuration).toBeGreaterThan(0);
      expect(pkg.branding.countryPrefix).toBe('m-');
    });

    it('should include X-Road as foundational service', async () => {
      const pkg = await generator.generatePackage(SampleCountries.KE);

      const serviceNames = pkg.services.map((s) => s.service.name);
      expect(serviceNames).toContain('X-Road');
    });

    it('should filter by requested categories', async () => {
      const pkg = await generator.generatePackage(SampleCountries.SG, [
        'voting',
      ]);

      const categories = pkg.services.map((s) => s.service.category);
      expect(categories).toContain('voting');
      expect(categories).toContain('governance'); // Always included
    });

    it('should calculate higher costs for countries with infrastructure gaps', async () => {
      const maltaPkg = await generator.generatePackage(SampleCountries.MT, [
        'healthcare',
      ]);
      const kenyaPkg = await generator.generatePackage(SampleCountries.KE, [
        'healthcare',
      ]);

      // Kenya has lower internet penetration, should have higher cost multiplier
      const maltaHealthCost =
        maltaPkg.services.find((s) => s.service.category === 'healthcare')
          ?.estimatedCost || 0;
      const kenyaHealthCost =
        kenyaPkg.services.find((s) => s.service.category === 'healthcare')
          ?.estimatedCost || 0;

      expect(kenyaHealthCost).toBeGreaterThan(maltaHealthCost);
    });
  });

  describe('exportAsZip', () => {
    it('should generate a valid ZIP buffer', async () => {
      const pkg = await generator.generatePackage(SampleCountries.MT, [
        'identity',
      ]);
      const zipBuffer = await generator.exportAsZip(pkg);

      expect(zipBuffer).toBeInstanceOf(Buffer);
      expect(zipBuffer.length).toBeGreaterThan(0);
      // ZIP files start with PK signature
      expect(zipBuffer[0]).toBe(0x50);
      expect(zipBuffer[1]).toBe(0x4b);
    });
  });
});
