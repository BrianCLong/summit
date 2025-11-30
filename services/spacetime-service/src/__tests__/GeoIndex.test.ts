/**
 * Unit tests for GeoIndex
 */

import { describe, expect, it, beforeEach } from '@jest/globals';
import { GeoIndex, createGeoIndex, type GeoIndexEntry } from '../indexes/GeoIndex.js';

describe('GeoIndex', () => {
  let index: GeoIndex<{ name: string }>;

  beforeEach(() => {
    index = createGeoIndex<{ name: string }>(7);
  });

  describe('insert', () => {
    it('inserts entries correctly', () => {
      index.insert({
        id: '1',
        entityId: 'entity-1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        data: { name: 'NYC' },
      });

      expect(index.count).toBe(1);
      expect(index.has('1')).toBe(true);
    });

    it('updates existing entry on duplicate id', () => {
      index.insert({
        id: '1',
        entityId: 'entity-1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        data: { name: 'NYC' },
      });

      index.insert({
        id: '1',
        entityId: 'entity-1',
        coordinate: { latitude: 34.0522, longitude: -118.2437 },
        data: { name: 'LA' },
      });

      expect(index.count).toBe(1);
      expect(index.get('1')?.data.name).toBe('LA');
    });
  });

  describe('delete', () => {
    it('deletes existing entry', () => {
      index.insert({
        id: '1',
        entityId: 'entity-1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        data: { name: 'NYC' },
      });

      expect(index.delete('1')).toBe(true);
      expect(index.count).toBe(0);
    });

    it('returns false for non-existent entry', () => {
      expect(index.delete('non-existent')).toBe(false);
    });
  });

  describe('findInBBox', () => {
    beforeEach(() => {
      // NYC area points
      index.insert({
        id: '1',
        entityId: 'e1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        data: { name: 'Manhattan' },
      });
      index.insert({
        id: '2',
        entityId: 'e1',
        coordinate: { latitude: 40.6892, longitude: -74.0445 },
        data: { name: 'Brooklyn' },
      });
      // LA point
      index.insert({
        id: '3',
        entityId: 'e2',
        coordinate: { latitude: 34.0522, longitude: -118.2437 },
        data: { name: 'LA' },
      });
    });

    it('finds entries in bounding box', () => {
      const results = index.findInBBox({
        minLat: 40.5,
        maxLat: 41,
        minLon: -75,
        maxLon: -73,
      });
      expect(results).toHaveLength(2);
    });

    it('returns empty for bbox with no entries', () => {
      const results = index.findInBBox({
        minLat: 0,
        maxLat: 1,
        minLon: 0,
        maxLon: 1,
      });
      expect(results).toHaveLength(0);
    });
  });

  describe('findInRadius', () => {
    beforeEach(() => {
      // Central point
      index.insert({
        id: 'center',
        entityId: 'e1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        data: { name: 'Center' },
      });
      // Nearby point (~5km away)
      index.insert({
        id: 'near',
        entityId: 'e1',
        coordinate: { latitude: 40.7484, longitude: -73.9857 },
        data: { name: 'Near' },
      });
      // Far point (~4000km away)
      index.insert({
        id: 'far',
        entityId: 'e2',
        coordinate: { latitude: 34.0522, longitude: -118.2437 },
        data: { name: 'Far' },
      });
    });

    it('finds entries within radius', () => {
      const results = index.findInRadius(
        { latitude: 40.7128, longitude: -74.006 },
        10000, // 10km
      );
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.distance <= 10000)).toBe(true);
    });

    it('returns results sorted by distance', () => {
      const results = index.findInRadius(
        { latitude: 40.7128, longitude: -74.006 },
        10000,
      );
      expect(results[0].id).toBe('center');
      expect(results[0].distance).toBe(0);
    });

    it('respects limit parameter', () => {
      const results = index.findInRadius(
        { latitude: 40.7128, longitude: -74.006 },
        10000,
        1,
      );
      expect(results).toHaveLength(1);
    });
  });

  describe('findKNearest', () => {
    beforeEach(() => {
      index.insert({
        id: '1',
        entityId: 'e1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        data: { name: 'Point 1' },
      });
      index.insert({
        id: '2',
        entityId: 'e1',
        coordinate: { latitude: 40.7484, longitude: -73.9857 },
        data: { name: 'Point 2' },
      });
      index.insert({
        id: '3',
        entityId: 'e2',
        coordinate: { latitude: 40.758, longitude: -73.9855 },
        data: { name: 'Point 3' },
      });
    });

    it('finds k nearest neighbors', () => {
      const results = index.findKNearest(
        { latitude: 40.7128, longitude: -74.006 },
        2,
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('1'); // Closest
    });

    it('respects maxDistance parameter', () => {
      const results = index.findKNearest(
        { latitude: 40.7128, longitude: -74.006 },
        10,
        1000, // 1km max
      );
      expect(results.every((r) => r.distance <= 1000)).toBe(true);
    });
  });

  describe('findInGeometry', () => {
    beforeEach(() => {
      index.insert({
        id: '1',
        entityId: 'e1',
        coordinate: { latitude: 5, longitude: 5 },
        data: { name: 'Inside' },
      });
      index.insert({
        id: '2',
        entityId: 'e1',
        coordinate: { latitude: 15, longitude: 15 },
        data: { name: 'Outside' },
      });
    });

    it('finds entries within polygon', () => {
      const polygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
      };

      const results = index.findInGeometry(polygon);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });
  });

  describe('findByEntity', () => {
    beforeEach(() => {
      index.insert({
        id: '1',
        entityId: 'e1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        data: { name: 'a' },
      });
      index.insert({
        id: '2',
        entityId: 'e1',
        coordinate: { latitude: 40.7484, longitude: -73.9857 },
        data: { name: 'b' },
      });
      index.insert({
        id: '3',
        entityId: 'e2',
        coordinate: { latitude: 34.0522, longitude: -118.2437 },
        data: { name: 'c' },
      });
    });

    it('finds all entries for entity', () => {
      const results = index.findByEntity('e1');
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.entityId === 'e1')).toBe(true);
    });

    it('returns empty for non-existent entity', () => {
      const results = index.findByEntity('non-existent');
      expect(results).toHaveLength(0);
    });
  });

  describe('bulkInsert', () => {
    it('inserts multiple entries efficiently', () => {
      const entries: GeoIndexEntry<{ name: string }>[] = [];
      for (let i = 0; i < 100; i++) {
        entries.push({
          id: `${i}`,
          entityId: `e${i % 10}`,
          coordinate: { latitude: i * 0.1, longitude: i * 0.1 },
          data: { name: `Point ${i}` },
        });
      }

      index.bulkInsert(entries);
      expect(index.count).toBe(100);
    });
  });

  describe('geohash operations', () => {
    it('encodes coordinates to geohash', () => {
      const geohash = index.getGeohash({ latitude: 40.7128, longitude: -74.006 });
      expect(geohash).toBeTruthy();
      expect(geohash.length).toBe(7);
    });

    it('decodes geohash to bounding box', () => {
      const geohash = index.getGeohash({ latitude: 40.7128, longitude: -74.006 });
      const bbox = index.decodeGeohash(geohash);

      expect(bbox.minLat).toBeLessThanOrEqual(40.7128);
      expect(bbox.maxLat).toBeGreaterThanOrEqual(40.7128);
      expect(bbox.minLon).toBeLessThanOrEqual(-74.006);
      expect(bbox.maxLon).toBeGreaterThanOrEqual(-74.006);
    });

    it('finds entries by geohash prefix', () => {
      index.insert({
        id: '1',
        entityId: 'e1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        data: { name: 'NYC' },
      });

      const geohash = index.getGeohash({ latitude: 40.7128, longitude: -74.006 });
      const prefix = geohash.substring(0, 4);
      const results = index.findByGeohashPrefix(prefix);

      expect(results).toHaveLength(1);
    });
  });

  describe('getBoundingBox', () => {
    it('returns null for empty index', () => {
      expect(index.getBoundingBox()).toBeNull();
    });

    it('returns correct bounds', () => {
      index.insert({
        id: '1',
        entityId: 'e1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        data: { name: 'NYC' },
      });
      index.insert({
        id: '2',
        entityId: 'e2',
        coordinate: { latitude: 34.0522, longitude: -118.2437 },
        data: { name: 'LA' },
      });

      const bbox = index.getBoundingBox();
      expect(bbox).not.toBeNull();
      expect(bbox!.minLat).toBeCloseTo(34.0522, 4);
      expect(bbox!.maxLat).toBeCloseTo(40.7128, 4);
      expect(bbox!.minLon).toBeCloseTo(-118.2437, 4);
      expect(bbox!.maxLon).toBeCloseTo(-74.006, 4);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      index.insert({
        id: '1',
        entityId: 'e1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        data: { name: 'NYC' },
      });

      index.clear();

      expect(index.count).toBe(0);
      expect(index.getEntityIds()).toHaveLength(0);
    });
  });
});
