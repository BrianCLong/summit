import { describe, it, expect } from '@jest/globals';
import { CPEMBuilder } from '../../../src/graphrag/cpem/mesh/builder';
import { PathFinder } from '../../../src/graphrag/cpem/analysis/path_finder';
import { VISUAL_EXFIL_PATTERN } from '../../../src/graphrag/cpem/patterns/library';
import { FICFZone } from '../../../src/graphrag/cpem/canonical/ficf';
import { SICFSensor } from '../../../src/graphrag/cpem/canonical/sicf';

describe('CPEM Pattern Library', () => {
  it('should detect visual exfil paths', () => {
     const zones: FICFZone[] = [
      {
        tenant_id: 't1', site_id: 's1', zone_id: 'z1', zone_type: 'ROOM',
        adjacency: ['z2'], sensors: [], entrances: [], policy_tags: ['SENSITIVE'], provenance: 'test', confidence: 1
      },
      {
        tenant_id: 't1', site_id: 's1', zone_id: 'z2', zone_type: 'HALLWAY',
        adjacency: ['z1'], sensors: [], entrances: [], policy_tags: [], provenance: 'test', confidence: 1
      }
    ];

    const sensors: SICFSensor[] = [
      {
        tenant_id: 't1', sensor_id: 'c1', sensor_type: 'CAMERA', zone_id: 'z2',
        coverage_model: 'CONE', coverage_params: { range: 'LONG' },
        data_modes: ['METADATA'], provenance: 'test', confidence: 1
      }
    ];

    const builder = new CPEMBuilder();
    builder.addZones(zones);
    builder.addSensors(sensors, zones);
    const graph = builder.getSnapshot();

    const finder = new PathFinder(graph);
    const paths = finder.findVulnerablePaths('z1', [VISUAL_EXFIL_PATTERN]);

    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0].pattern_id).toBe('VIS-001');
    expect(paths[0].description).not.toMatch(/how to/i);
  });
});
