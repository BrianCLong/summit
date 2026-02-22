import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { AdaptivityDetector } from './detectors/adaptivity';
import { SwarmDetector } from './detectors/swarm';
import { calculateAttentionLoad } from './metrics/attention-load';
import { calculateTrustShock } from './metrics/trust-shock';
import { calculateCohesionFracture } from './metrics/cohesion-fracture';
import { CrossDomainLinker, Incident, Narrative } from './linking/cross-domain-linker';
import { MessageNode } from './features/variant-graph';

const program = new Command();

program
  .name('cogwar')
  .description('Cognitive Warfare Analysis Tool');

program.command('analyze')
  .description('Analyze fixtures for cognitive warfare patterns')
  .option('--fixtures <path>', 'Path to fixtures directory')
  .option('--out <path>', 'Output directory', 'evidence_bundles')
  .action(async (options) => {
    console.log('Running CogWar Analysis...');
    const fixtureDir = options.fixtures;
    const outDir = options.out;

    if (!fixtureDir) {
      console.error('Error: --fixtures required');
      process.exit(1);
    }

    // 1. Ingest Messages
    const messages: MessageNode[] = [];
    const messageFiles = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.jsonl')).sort(); // Sort for determinism

    let combinedContent = '';

    for (const file of messageFiles) {
      const content = fs.readFileSync(path.join(fixtureDir, file), 'utf-8');
      combinedContent += content;
      content.trim().split('\n').forEach(line => {
        try {
          messages.push(JSON.parse(line));
        } catch (e) {
          // Ignore bad lines
        }
      });
    }
    console.log(`Ingested ${messages.length} messages.`);

    if (messages.length === 0) {
      console.error('No messages found.');
      process.exit(0);
    }

    // Sort messages by timestamp for determinism
    messages.sort((a, b) => a.timestamp - b.timestamp);
    const lastTimestamp = messages[messages.length - 1].timestamp;
    const analysisDate = new Date(lastTimestamp).toISOString();

    // 2. Run Detectors
    const adaptivityDetector = new AdaptivityDetector();
    adaptivityDetector.ingest(messages);
    const adaptivityResult = adaptivityDetector.analyze(lastTimestamp);

    const swarmDetector = new SwarmDetector();
    swarmDetector.ingest(messages);
    const swarmResult = swarmDetector.analyze();

    // 3. Run Metrics
    const attentionLoad = calculateAttentionLoad(messages, 24 * 3600 * 1000);
    const trustShock = calculateTrustShock(messages);
    const cohesionFracture = calculateCohesionFracture(messages);

    // 4. Run Linking
    const incidentDir = path.join(path.dirname(fixtureDir), 'incidents');
    let incidents: Incident[] = [];
    if (fs.existsSync(incidentDir)) {
      const incidentFiles = fs.readdirSync(incidentDir).filter(f => f.endsWith('.json')).sort();
      for (const file of incidentFiles) {
        const content = JSON.parse(fs.readFileSync(path.join(incidentDir, file), 'utf-8'));
        if (content.incidents) {
          incidents = incidents.concat(content.incidents);
        }
      }
    }

    const narratives: Narrative[] = adaptivityResult.evidence.map((clusterId, idx) => ({
      id: clusterId,
      startTime: messages[0].timestamp,
      summary: `Detected variant cluster ${clusterId}`,
      keywords: ['variant']
    }));

    const linker = new CrossDomainLinker();
    const linkages = linker.link(incidents, narratives);

    // 5. Generate Deterministic IDs
    const contentHash = createHash('sha256').update(combinedContent).digest('hex').substring(0, 8);
    const evidenceId = `EVD:CW26:adaptivity:run-1:${contentHash}`;
    const campaignHash = createHash('sha256').update(evidenceId).digest('hex').substring(0, 8).toUpperCase();
    const campaignDate = new Date(lastTimestamp).toISOString().slice(0,10).replace(/-/g,'');
    const campaignId = `CMP-CW26-${campaignDate}-${campaignHash}`;

    // 6. Generate Output
    const report = {
      campaign_id: campaignId,
      name: "Fixture Analysis Campaign",
      status: "suspected",
      vectors: ["social", "cognitive"],
      metrics: {
        adaptivity_score: adaptivityResult.score,
        swarm_coordination_score: swarmResult.maxSynchronicity,
        cross_domain_correlation: linkages.length > 0 ? 1.0 : 0.0,
        attention_load: attentionLoad,
        trust_shock: trustShock
      },
      evidence_bundle_id: evidenceId,
      linkages
    };

    const evidence = {
      evidence_id: evidenceId,
      timestamp: analysisDate, // Deterministic based on input data max timestamp
      artifacts: messageFiles.map(f => ({
        type: "post",
        hash: "dummy-hash", // Ideally hash file content
        uri: `file://${path.join(fixtureDir, f)}`
      })),
      features: {
        adaptivity: adaptivityResult,
        swarms: swarmResult,
        metrics: { attentionLoad, trustShock, cohesionFracture }
      },
      provenance: {
        detector_version: "1.0.0",
        commit_sha: "git-sha" // Placeholder, in real CI this would be injected
      }
    };

    const stamp = {
      generator: "cogwar-cli",
      version: "1.0.0",
      commit_sha: process.env.GITHUB_SHA || "local-dev",
      input_hash: contentHash
    };

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2));
    fs.writeFileSync(path.join(outDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

    console.log(`Analysis complete. Outputs in ${outDir}`);
  });

program.parse(process.argv);
