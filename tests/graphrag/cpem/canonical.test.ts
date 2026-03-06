import { describe, it, expect } from '@jest/globals';
import { FICFZoneSchema } from '../../../src/graphrag/cpem/canonical/ficf';
import { SICFSensorSchema } from '../../../src/graphrag/cpem/canonical/sicf';
import { HICFEventSchema } from '../../../src/graphrag/cpem/canonical/hicf';

describe('CPEM Canonical Formats', () => {
  it('should validate a correct FICF Zone', () => {
    const validZone = {
      tenant_id: 't1',
      site_id: 's1',
      zone_id: 'z1',
      zone_type: 'ROOM',
      adjacency: ['z2'],
      sensors: ['c1'],
      entrances: ['d1'],
      policy_tags: ['RESTRICTED'],
      provenance: 'manual',
      confidence: 0.9,
    };
    expect(FICFZoneSchema.parse(validZone)).toEqual(validZone);
  });

  it('should reject FICF Zone with precise coordinates', () => {
    const invalidZone = {
      tenant_id: 't1',
      site_id: 's1',
      zone_id: 'z1',
      zone_type: 'ROOM',
      adjacency: [],
      sensors: [],
      entrances: [],
      policy_tags: [],
      provenance: 'manual',
      confidence: 0.9,
      coordinates: { x: 10, y: 20 },
    };
    expect(() => FICFZoneSchema.parse(invalidZone)).toThrow();
  });

  it('should reject SICF Sensor with raw stream URL', () => {
    const invalidSensor = {
      tenant_id: 't1',
      sensor_id: 'c1',
      sensor_type: 'CAMERA',
      zone_id: 'z1',
      coverage_model: 'CONE',
      data_modes: ['VIDEO_METADATA'],
      provenance: 'vms',
      confidence: 1.0,
      raw_stream_url: 'rtsp://admin:admin@192.168.1.10',
    };
    expect(() => SICFSensorSchema.parse(invalidSensor)).toThrow();
  });

  it('should validate correct HICF Event', () => {
      const validEvent = {
          tenant_id: 't1',
          event_id: 'e1',
          event_type: 'BADGE_ACCESS',
          site_id: 's1',
          observed_at: new Date().toISOString(),
          severity: 'LOW',
          provenance: 'acs',
          confidence: 1.0
      };
      expect(HICFEventSchema.parse(validEvent)).toEqual(validEvent);
  });
});
