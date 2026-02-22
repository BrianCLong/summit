import { DiscoveryRetriever } from '../../services/graphrag-engine/src/discovery/DiscoveryRetriever';
import { JustificationEvidenceAPI } from '../../services/graphrag-engine/src/justification/JustificationEvidenceAPI';
import { DeliberationEngine } from '../../services/graphrag-engine/src/deliberation/DeliberationEngine';
import { EvidenceWriter } from '../../services/graphrag-engine/src/evidence/EvidenceWriter';
import { AnsweringPolicy } from '../../services/graphrag-engine/src/policies/answering';
import { Phase } from '../../packages/graphrag-core/src/phases';
import { RegistryLoader } from '../../packages/graphrag-core/src/query_registry/index';
import * as fs from 'fs';

async function main() {
  // Mock driver and session for offline eval
  const mockSession = {
    run: async (cypher: string) => {
      if (cypher.includes('SUPPORTED_BY')) {
        return {
          records: [
            {
              forEach: (cb: any) => {
                cb({ labels: ['Entity'], properties: { id: 'e1', evidence_id: 'EVID-1' } });
                cb({ labels: ['Entity'], properties: { id: 'e2', evidence_id: 'EVID-1' } });
                cb({ type: 'SUPPORTED_BY', start: 'e1', end: 'e2', properties: {} });
              }
            }
          ]
        };
      }
      return {
        records: [
          {
            get: (key: string) => {
              if (key === 'entityId') return 'e1';
              if (key === 'pathNodes') return [{}, {}];
              return null;
            },
          }
        ]
      };
    },
    close: async () => {}
  };

  const mockDriver = {
    session: () => mockSession,
    close: async () => {}
  } as any;

  const registryData = JSON.parse(fs.readFileSync('packages/graphrag-core/src/query_registry/registry.json', 'utf8'));
  const registry = RegistryLoader.validate(registryData);

  const discovery = new DiscoveryRetriever(mockDriver);
  const justification = new JustificationEvidenceAPI(mockDriver, registry);
  const policy = new AnsweringPolicy({ minRobustness: 0.1, minEvidenceDiversity: 1 });
  const evidenceWriter = new EvidenceWriter({ outputDir: 'evidence/eval-repro', runId: 'eval-run', gitShortSha: 'test-sha' });

  console.log('Running Discovery...');
  const discoResult = await discovery.discover('Who is Alpha?', ['seed1'], { maxHops: 2, maxCandidates: 1, timeoutMs: 1000 });

  console.log('Running Justification...');
  const proof = await justification.fetchProof('justification-proof', { id: 'e1', max_rows: 5 });

  console.log('Running Deliberation...');
  const deliberation = DeliberationEngine.deliberate([{ explanation: discoResult.candidates[0], proof }]);

  const decision = policy.shouldRefuse(deliberation);
  if (decision.refuse) {
    console.log('Policy Refused:', decision.reason);
  } else {
    console.log('Policy Approved. Writing Artifacts...');
    const evid = evidenceWriter.writeArtifacts(deliberation, { latency: 150 });
    console.log('Artifacts written to:', evid);
  }
}

main().catch(console.error);
