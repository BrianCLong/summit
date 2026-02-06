import { describe, it, expect } from '@jest/globals';
import { SESEngine } from '../../../src/agents/cpem/ses/equilibrium';
import { CPEMBuilder } from '../../../src/graphrag/cpem/mesh/builder';
import { FICFZone } from '../../../src/graphrag/cpem/canonical/ficf';
import { SICFSensor } from '../../../src/graphrag/cpem/canonical/sicf';

describe('SES Engine', () => {
    it('should generate remediation portfolio for vulnerable graph', () => {
        const zones: FICFZone[] = [
            { tenant_id: 't1', site_id: 's1', zone_id: 'z1', zone_type: 'ROOM', adjacency: ['z2'], sensors: [], entrances: [], policy_tags: [], provenance: 'test', confidence: 1 },
            { tenant_id: 't1', site_id: 's1', zone_id: 'z2', zone_type: 'HALLWAY', adjacency: ['z1'], sensors: [], entrances: [], policy_tags: [], provenance: 'test', confidence: 1 }
        ];
        const sensors: SICFSensor[] = [
            { tenant_id: 't1', sensor_id: 'c1', sensor_type: 'CAMERA', zone_id: 'z2', coverage_model: 'CONE', coverage_params: { range: 'LONG' }, data_modes: ['METADATA'], provenance: 'test', confidence: 1 }
        ];

        const builder = new CPEMBuilder();
        builder.addZones(zones);
        builder.addSensors(sensors, zones);
        const graph = builder.getSnapshot();

        const ses = new SESEngine(graph);
        const result = ses.runSimulation('z1');

        expect(result.initial_risk).toBeGreaterThan(0);
        expect(result.remediation_portfolio).toContain('Mask Sensor c1');
        expect(result.residual_risk).toBe(0);
    });
});
