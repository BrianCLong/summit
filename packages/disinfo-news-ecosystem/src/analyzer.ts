import { analyzeContent } from './signals/content.js';
import { analyzeProvenance } from './signals/provenance.js';
import { analyzeNetwork } from './signals/network.js';
import { generatePlaybook } from './playbooks.js';

function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

export async function analyzeBundle(bundle: any, evidenceId: string) {
  const sanitizedBundle = {
      ...bundle,
      items: (bundle.items || []).map((item: any) => {
          if (item.text) {
              return { ...item, text: sanitize(item.text) };
          }
          return item;
      })
  };

  const contentSignals = analyzeContent(sanitizedBundle);
  const provenanceSignals = analyzeProvenance(sanitizedBundle);
  const networkSignals = analyzeNetwork(sanitizedBundle);

  const riskScore = calculateRisk(contentSignals, provenanceSignals, networkSignals);

  const reportBase = {
    evidence_id: evidenceId,
    risk_score: riskScore,
    signals: {
      content: contentSignals,
      provenance: provenanceSignals,
      network: networkSignals
    }
  };

  const { mitigations, targetingGap } = generatePlaybook(reportBase);

  return {
    ...reportBase,
    targeting_gap: targetingGap,
    mitigations: mitigations
  };
}

function calculateRisk(content: any, prov: any, net: any) {
  let score = 0;
  if (content.sensationalism_score > 0.5) score += 0.3;
  if (prov.has_missing_credentials) score += 0.4;
  if (net.coordinated_sharing_events > 0) score += 0.3;
  return Math.min(score, 1.0);
}
