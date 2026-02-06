import { describe, it, expect } from '@jest/globals';
import { CPEMBuilder } from '../../../src/graphrag/cpem/mesh/builder';
import { FICFZone } from '../../../src/graphrag/cpem/canonical/ficf';
import { SICFSensor } from '../../../src/graphrag/cpem/canonical/sicf';

describe('CPEM Graph Builder', () => {
  it('should build a graph from zones and sensors', () => {
    const zones: FICFZone[] = [
      {
        tenant_id: 't1', site_id: 's1', zone_id: 'z1', zone_type: 'ROOM',
        adjacency: ['z2'], sensors: ['c1'], entrances: [], policy_tags: [], provenance: 'test', confidence: 1
      },
      {
        tenant_id: 't1', site_id: 's1', zone_id: 'z2', zone_type: 'HALLWAY',
        adjacency: ['z1'], sensors: [], entrances: [], policy_tags: [], provenance: 'test', confidence: 1
      }
    ];

    const sensors: SICFSensor[] = [
      {
        tenant_id: 't1', sensor_id: 'c1', sensor_type: 'CAMERA', zone_id: 'z1',
        coverage_model: 'CONE', coverage_params: { range: 'LONG' },
        data_modes: ['METADATA'], provenance: 'test', confidence: 1
      }
    ];

    const builder = new CPEMBuilder();
    builder.addZones(zones);
    builder.addSensors(sensors, zones);

    const graph = builder.getSnapshot();

    expect(graph.nodes.has('z1')).toBe(true);
    expect(graph.nodes.has('c1')).toBe(true);

    // Check Adjacency
    const adjEdge = graph.edges.find(e => e.source === 'z1' && e.target === 'z2' && e.type === 'ADJACENT_TO');
    expect(adjEdge).toBeDefined();

    // Check LOS (Long range sees adjacent z2)
    const losEdge = graph.edges.find(e => e.source === 'c1' && e.target === 'z2' && e.type === 'LINE_OF_SIGHT');
    expect(losEdge).toBeDefined();
  });
});
