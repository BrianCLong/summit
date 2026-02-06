import fs from 'fs';
import path from 'path';
import { CPEMBuilder } from '../src/graphrag/cpem/mesh/builder';
import { SESEngine } from '../src/agents/cpem/ses/equilibrium';
import { FICFZone } from '../src/graphrag/cpem/canonical/ficf';
import { SICFSensor } from '../src/graphrag/cpem/canonical/sicf';
import { CPEM_EVIDENCE_IDS } from '../src/graphrag/cpem/evidence';

const EVIDENCE_DIR = path.join(process.cwd(), 'evidence', CPEM_EVIDENCE_IDS.FACILITY_PRIVACY);

if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function generateEvidence() {
    const zones: FICFZone[] = [
        { tenant_id: 't1', site_id: 's1', zone_id: 'z1', zone_type: 'ROOM', adjacency: ['z2'], sensors: [], entrances: [], policy_tags: ['SENSITIVE'], provenance: 'sim', confidence: 1 },
        { tenant_id: 't1', site_id: 's1', zone_id: 'z2', zone_type: 'HALLWAY', adjacency: ['z1'], sensors: [], entrances: [], policy_tags: [], provenance: 'sim', confidence: 1 }
    ];
    const sensors: SICFSensor[] = [
        { tenant_id: 't1', sensor_id: 'c1', sensor_type: 'CAMERA', zone_id: 'z2', coverage_model: 'CONE', coverage_params: { range: 'LONG' }, data_modes: ['METADATA'], provenance: 'sim', confidence: 1 }
    ];

    const builder = new CPEMBuilder();
    builder.addZones(zones);
    builder.addSensors(sensors, zones);
    const graph = builder.getSnapshot();

    const ses = new SESEngine(graph);
    const result = ses.runSimulation('z1');

    const report = {
        item: { slug: 'cpem-ses-sim', date: '2025-01-29' },
        run: { mode: 'simulation' },
        findings: [
            {
                evidence_id: CPEM_EVIDENCE_IDS.SES,
                severity: result.initial_risk > 0 ? 'HIGH' : 'LOW',
                summary: `Simulated SES run found ${result.remediation_portfolio.length} remediations reducing risk from ${result.initial_risk} to ${result.residual_risk}.`
            }
        ]
    };

    const metrics = {
        schema_version: '1.0',
        counters: {
            initial_risk: result.initial_risk,
            remediations_count: result.remediation_portfolio.length
        }
    };

    const stamp = {
        generated_at: new Date().toISOString(),
        mode: 'simulation'
    };

    const index = {
        bundle_id: CPEM_EVIDENCE_IDS.FACILITY_PRIVACY,
        artifacts: {
            report: 'report.json',
            metrics: 'metrics.json',
            stamp: 'stamp.json'
        }
    };

    fs.writeFileSync(path.join(EVIDENCE_DIR, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'stamp.json'), JSON.stringify(stamp, null, 2));
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'index.json'), JSON.stringify(index, null, 2));

    console.log(`Evidence generated in ${EVIDENCE_DIR}`);
}

generateEvidence();
