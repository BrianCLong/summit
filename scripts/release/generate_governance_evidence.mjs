
import fs from 'fs';
import path from 'path';

const evidenceDir = path.join(process.cwd(), 'evidence');
const outputFile = path.join(evidenceDir, 'governance-bundle.json');

if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
}

// Gather all evidence
const bundle = {
    timestamp: new Date().toISOString(),
    artifacts: {
        taxonomy: null,
        registry: null,
        compliance_report: null,
        traces: [],
        policy_cards: []
    },
    summary: {
        total_traces: 0,
        policy_card_count: 0,
        compliant: false
    }
};

try {
    if (fs.existsSync(path.join(evidenceDir, 'taxonomy.stamp.json'))) {
        bundle.artifacts.taxonomy = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'taxonomy.stamp.json'), 'utf-8'));
    }

    if (fs.existsSync(path.join(process.cwd(), 'governance/registry.json'))) {
        bundle.artifacts.registry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'governance/registry.json'), 'utf-8'));
    }

    if (fs.existsSync(path.join(evidenceDir, 'compliance_report.json'))) {
        bundle.artifacts.compliance_report = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'compliance_report.json'), 'utf-8'));
    }

    // Load Traces
    const tracesDir = path.join(evidenceDir, 'traces'); // Root evidence dir (Phase 2 created server/evidence/traces, need to check both)

    // Check root traces
    if (fs.existsSync(tracesDir)) {
        const files = fs.readdirSync(tracesDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                bundle.artifacts.traces.push(JSON.parse(fs.readFileSync(path.join(tracesDir, file), 'utf-8')));
            }
        }
    }

    // Check server traces (where Phase 2 verification put them)
    const serverTracesDir = path.join(process.cwd(), 'server/evidence/traces');
    if (fs.existsSync(serverTracesDir)) {
        const files = fs.readdirSync(serverTracesDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                bundle.artifacts.traces.push(JSON.parse(fs.readFileSync(path.join(serverTracesDir, file), 'utf-8')));
            }
        }
    }

    // Load Policy Cards
    const cardsDir = path.join(process.cwd(), 'policy/cards');
    if (fs.existsSync(cardsDir)) {
        const files = fs.readdirSync(cardsDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                bundle.artifacts.policy_cards.push(JSON.parse(fs.readFileSync(path.join(cardsDir, file), 'utf-8')));
            }
        }
    }

    // Calculate Summary
    bundle.summary.total_traces = bundle.artifacts.traces.length;
    bundle.summary.policy_card_count = bundle.artifacts.policy_cards.length;

    // Determine compliance
    const hasTaxonomy = !!bundle.artifacts.taxonomy;
    const hasRegistry = !!bundle.artifacts.registry;
    const reportCompliant = bundle.artifacts.compliance_report?.frameworks?.EU_AI_ACT?.status === 'COMPLIANT';

    bundle.summary.compliant = hasTaxonomy && hasRegistry && reportCompliant;

} catch (e) {
    console.error('Error generating bundle:', e);
    process.exit(1);
}

fs.writeFileSync(outputFile, JSON.stringify(bundle, null, 2));
console.log(`✅ Governance Evidence Bundle generated at ${outputFile}`);
console.log(`   Compliance Status: ${bundle.summary.compliant ? 'PASSED' : 'FAILED'}`);
console.log(`   Traces Collected: ${bundle.summary.total_traces}`);
