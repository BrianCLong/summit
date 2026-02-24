import { InterpretiveDefault, SupportSpan } from '../schema/evidence_v1';
import { evId } from '../evidence/ids';
import { findSupportSpan } from './support_spans';

// Mock rule set for MWS
const RULES = [
  {
    trigger: 'obviously',
    type: 'presupposition' as const,
    template: 'It is presupposed that X is true',
    id: 'tpl-obviously-1'
  },
  {
    trigger: 'implies that',
    type: 'causal_link' as const,
    template: 'X implies Y',
    id: 'tpl-implies-1'
  }
];

export async function extractDefaults(docText: string, docId: string): Promise<InterpretiveDefault[]> {
  const defaults: InterpretiveDefault[] = [];

  for (const rule of RULES) {
    if (docText.includes(rule.trigger)) {
      const span = findSupportSpan(docText, rule.trigger, docId);
      if (span) {
        // In a real system, we would extract the specific X/Y content here.
        // For MWS, we use the trigger context.
        const content = `Inferred from '${rule.trigger}' in ${docId}`;

        defaults.push({
          default_id: evId('default', content + docId),
          assumption_type: rule.type,
          content: content,
          support_spans: [span],
          confidence: 0.8, // Calibrated mock confidence
          rationale_template_id: rule.id
        });
      }
    }
  }

  return defaults;
}
