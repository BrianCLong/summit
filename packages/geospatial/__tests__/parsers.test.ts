/**
 * Parser tests for geospatial data formats
 */

import { GeoJSONParser } from '../src/parsers/geojson-parser';
import { KMLParser } from '../src/parsers/kml-parser';

describe('GeoJSONParser', () => {
  const validGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-74.006, 40.7128],
        },
        properties: {
          name: 'New York City',
        },
      },
    ],
  };

  describe('parse()', () => {
    it('should parse valid GeoJSON object', () => {
      const result = GeoJSONParser.parse(validGeoJSON);

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
      expect(result.features[0].geometry.type).toBe('Point');
    });

    it('should parse valid GeoJSON string', () => {
      const result = GeoJSONParser.parse(JSON.stringify(validGeoJSON));

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
    });

    it('should add metadata to collection', () => {
      const result = GeoJSONParser.parse(validGeoJSON);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.source).toBe('geojson');
    });

    it('should enrich features with timestamp', () => {
      const result = GeoJSONParser.parse(validGeoJSON);

      expect(result.features[0].properties?.timestamp).toBeDefined();
    });

    it('should throw for invalid JSON string', () => {
      expect(() => GeoJSONParser.parse('invalid json')).toThrow();
    });

    it('should throw for non-FeatureCollection', () => {
      const invalidGeoJSON = { type: 'Feature', geometry: {} };
      expect(() => GeoJSONParser.parse(invalidGeoJSON)).toThrow();
    });
  });

  describe('validate()', () => {
    it('should return true for valid GeoJSON', () => {
      expect(GeoJSONParser.validate(validGeoJSON)).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(GeoJSONParser.validate(null)).toBe(false);
      expect(GeoJSONParser.validate('string')).toBe(false);
      expect(GeoJSONParser.validate({ type: 'Invalid' })).toBe(false);
    });

    it('should return false for missing features', () => {
      expect(GeoJSONParser.validate({ type: 'FeatureCollection' })).toBe(false);
    });
  });

  describe('export()', () => {
    it('should export to JSON string', () => {
      const collection = GeoJSONParser.parse(validGeoJSON);
      const exported = GeoJSONParser.export(collection);

      expect(typeof exported).toBe('string');
      expect(JSON.parse(exported).type).toBe('FeatureCollection');
    });

    it('should support pretty printing', () => {
      const collection = GeoJSONParser.parse(validGeoJSON);
      const pretty = GeoJSONParser.export(collection, true);
      const compact = GeoJSONParser.export(collection, false);

      expect(pretty.length).toBeGreaterThan(compact.length);
    });
  });

  describe('merge()', () => {
    it('should merge multiple collections', () => {
      const collection1 = GeoJSONParser.parse(validGeoJSON);
      const collection2 = GeoJSONParser.parse(validGeoJSON);

      const merged = GeoJSONParser.merge([collection1, collection2]);

      expect(merged.features).toHaveLength(2);
      expect(merged.metadata?.source).toBe('merged');
    });
  });
});

describe('KMLParser', () => {
  const validKML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test Document</name>
    <Placemark>
      <name>Test Point</name>
      <Point>
        <coordinates>-74.006,40.7128,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

  describe('parse()', () => {
    it('should parse valid KML', () => {
      const result = KMLParser.parse(validKML);

      expect(result.type).toBe('FeatureCollection');
      expect(result.features.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract point geometry', () => {
      const result = KMLParser.parse(validKML);
      const point = result.features[0];

      expect(point.geometry.type).toBe('Point');
    });

    it('should add metadata', () => {
      const result = KMLParser.parse(validKML);

      expect(result.metadata?.source).toBe('kml');
    });

    it('should throw for invalid KML', () => {
      expect(() => KMLParser.parse('<invalid>')).toThrow();
    });
  });

  describe('export()', () => {
    it('should export to KML string', () => {
      const collection = KMLParser.parse(validKML);
      const exported = KMLParser.export(collection);

      expect(exported).toContain('<?xml');
      expect(exported).toContain('<kml');
      expect(exported).toContain('<Placemark>');
    });
  });
});
