import type { ExplanationStep, QueryContext, QueryIntent } from './types.js';

export interface RuleDefinition {
  id: string;
  intent: QueryIntent;
  keywords?: string[];
  phrases?: string[];
  patterns?: RegExp[];
  contextMatches?: { key: string; values: string[] }[];
  confidence: number;
}

export interface RuleMatch {
  intent: QueryIntent;
  confidence: number;
  ruleId: string;
  trigger: string;
  explanation: ExplanationStep;
}

const normalize = (value: string) => value.toLowerCase();

const tokenize = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const ensureArray = (value?: string[]) => (value ? value.map(normalize) : []);

const matchesContext = (
  context: QueryContext | undefined,
  contextMatches: RuleDefinition['contextMatches'],
): boolean => {
  if (!contextMatches || contextMatches.length === 0) {
    return true;
  }

  if (!context) {
    return false;
  }

  return contextMatches.every(({ key, values }) => {
    const normalizedValues = values.map(normalize);
    const ctxValue = context[key];

    if (Array.isArray(ctxValue)) {
      const ctxArray = ctxValue.map((item) => normalize(String(item)));
      return normalizedValues.some((value) => ctxArray.includes(value));
    }

    if (typeof ctxValue === 'string') {
      return normalizedValues.includes(normalize(ctxValue));
    }

    return false;
  });
};

export class RuleEngine {
  private readonly rules: RuleDefinition[];

  constructor(rules: RuleDefinition[]) {
    this.rules = rules;
  }

  public evaluate(query: string, context?: QueryContext): RuleMatch | null {
    const normalizedQuery = normalize(query);
    const tokens = tokenize(query);
    const tokenSet = new Set(tokens);

    let bestMatch: RuleMatch | null = null;

    this.rules.forEach((rule, index) => {
      if (!matchesContext(context, rule.contextMatches)) {
        return;
      }

      const normalizedKeywords = ensureArray(rule.keywords);
      const normalizedPhrases = ensureArray(rule.phrases);
      const patterns = rule.patterns ?? [];

      let trigger: string | null = null;

      if (normalizedKeywords.length > 0) {
        for (const keyword of normalizedKeywords) {
          if (tokenSet.has(keyword)) {
            trigger = keyword;
            break;
          }
        }
      }

      if (!trigger && normalizedPhrases.length > 0) {
        for (const phrase of normalizedPhrases) {
          if (normalizedQuery.includes(phrase)) {
            trigger = phrase;
            break;
          }
        }
      }

      if (!trigger && patterns.length > 0) {
        for (const pattern of patterns) {
          if (pattern.test(query)) {
            trigger = pattern.source;
            break;
          }
        }
      }

      if (trigger) {
        const explanation: ExplanationStep = {
          stage: 'rule',
          intent: rule.intent,
          confidence: rule.confidence,
          description: `Rule ${rule.id} matched on "${trigger}"`,
          details: {
            ruleId: rule.id,
            trigger,
            priority: index,
          },
        };

        const match: RuleMatch = {
          intent: rule.intent,
          confidence: rule.confidence,
          ruleId: rule.id,
          trigger,
          explanation,
        };

        if (!bestMatch) {
          bestMatch = match;
          return;
        }

        if (match.confidence > bestMatch.confidence) {
          bestMatch = match;
          return;
        }

        if (match.confidence === bestMatch.confidence && index < (bestMatch.explanation.details?.priority as number)) {
          bestMatch = match;
        }
      }
    });

    return bestMatch;
  }
}

export const defaultRules: RuleDefinition[] = [
  {
    id: 'fraud-high-signal',
    intent: 'fraud',
    keywords: ['fraud', 'chargeback', 'laundering', 'aml', 'stolen', 'synthetic', 'suspicious'],
    phrases: ['account takeover', 'stolen card', 'suspicious wire'],
    confidence: 0.97,
  },
  {
    id: 'fraud-alert-context',
    intent: 'fraud',
    contextMatches: [{ key: 'channel', values: ['fraud', 'risk-desk', 'aml'] }],
    confidence: 0.9,
  },
  {
    id: 'support-ticket',
    intent: 'support',
    keywords: ['ticket', 'support', 'helpdesk', 'incident', 'outage', 'downtime'],
    phrases: ['customer issue', 'need assistance', 'service request'],
    confidence: 0.92,
  },
  {
    id: 'support-channel',
    intent: 'support',
    contextMatches: [{ key: 'channel', values: ['support', 'helpdesk', 'csat'] }],
    confidence: 0.86,
  },
  {
    id: 'marketing-campaign',
    intent: 'marketing',
    keywords: ['campaign', 'conversion', 'click', 'impression', 'retargeting', 'acquisition'],
    phrases: ['paid media', 'email blast', 'lead funnel'],
    confidence: 0.91,
  },
  {
    id: 'marketing-channel',
    intent: 'marketing',
    contextMatches: [{ key: 'channel', values: ['marketing', 'crm', 'adtech'] }],
    confidence: 0.84,
  },
  {
    id: 'analytics-dashboard',
    intent: 'analytics',
    keywords: ['metric', 'dashboard', 'trend', 'kpi', 'kpis', 'insight', 'reporting'],
    phrases: ['time series', 'variance analysis', 'forecast model'],
    confidence: 0.9,
  },
  {
    id: 'analytics-role',
    intent: 'analytics',
    contextMatches: [{ key: 'userRole', values: ['analyst', 'bi-analyst', 'fp&a'] }],
    confidence: 0.83,
  },
  {
    id: 'research-project',
    intent: 'research',
    keywords: ['research', 'study', 'hypothesis', 'survey', 'publication', 'paper'],
    phrases: ['peer review', 'literature review', 'experiment design'],
    confidence: 0.88,
  },
  {
    id: 'research-context',
    intent: 'research',
    contextMatches: [{ key: 'tags', values: ['research', 'academic', 'r&d'] }],
    confidence: 0.82,
  },
];
