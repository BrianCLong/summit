import { GeoIPEnricher } from '../src/enrichers/geoip';
import { OCREnricher } from '../src/enrichers/ocr';

describe('Enrichers', () => {
  describe('GeoIPEnricher', () => {
    it('should add location data if an IP address is present', async () => {
      const enricher = new GeoIPEnricher();
      const data = { ip_address: '8.8.8.8' };
      const enrichedData = await enricher.enrich(data);
      expect(enrichedData).toHaveProperty('location');
      expect(enrichedData.location).toEqual({
        city: 'Mock City',
        country: 'Mock Country',
      });
    });

    it('should not modify data if no IP address is present', async () => {
      const enricher = new GeoIPEnricher();
      const data = { other_field: 'value' };
      const enrichedData = await enricher.enrich({ ...data });
      expect(enrichedData).toEqual(data);
    });
  });

  describe('OCREnricher', () => {
    it('should add text content if the file is a PDF', async () => {
      const enricher = new OCREnricher();
      const data = { file_path: 'test.pdf' };
      const enrichedData = await enricher.enrich(data);
      expect(enrichedData).toHaveProperty('text_content', 'Mock OCR text content.');
    });

    it('should not modify data if the file is not a PDF', async () => {
      const enricher = new OCREnricher();
      const data = { file_path: 'test.txt' };
      const enrichedData = await enricher.enrich({ ...data });
      expect(enrichedData).toEqual(data);
    });
  });
});
