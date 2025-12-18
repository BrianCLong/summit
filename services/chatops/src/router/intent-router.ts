/**
 * Multi-Model Intent Router
 *
 * Implements consensus-based intent classification across multiple LLMs:
 * - Parallel execution (Claude, GPT-4, Qwen)
 * - Confidence-weighted voting
 * - OSINT entity fusion
 * - Context re-ranking
 * - Guardrails/jailbreak detection
 *
 * Differentiator vs. competitors:
 * - Palantir: No OSINT entity fusion
 * - Recorded Future: Stateless keyword routing
 * - Maltego: Manual transforms only
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

import {
  AggregatedIntent,
  ContextChunk,
  GuardrailFlag,
  IntentResult,
  OSINTEntity,
  OSINTEntityType,
  SecurityContext,
} from '../types.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const INTENT_CATEGORIES = [
  'entity_lookup',
  'path_finding',
  'threat_assessment',
  'timeline_analysis',
  'relationship_mapping',
  'report_generation',
  'alert_creation',
  'data_export',
  'investigation_create',
  'general_query',
] as const;

type IntentCategory = (typeof INTENT_CATEGORIES)[number];

const OSINT_ENTITY_PATTERNS: Record<OSINTEntityType, RegExp[]> = {
  THREAT_ACTOR: [
    /APT\d+/gi,
    /\b(Fancy Bear|Cozy Bear|Lazarus|Turla|Sandworm|Wizard Spider|Evil Corp|FIN\d+)\b/gi,
    /threat actor/gi,
  ],
  INFRASTRUCTURE: [
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
    /\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/g, // Domains
  ],
  MALWARE: [
    /\b(Emotet|TrickBot|Ryuk|Conti|LockBit|BlackCat|Cobalt Strike|Mimikatz)\b/gi,
    /malware|trojan|ransomware|backdoor/gi,
  ],
  CAMPAIGN: [/operation\s+\w+/gi, /campaign\s+\w+/gi],
  TTP: [
    /T\d{4}(\.\d{3})?/g, // MITRE ATT&CK IDs
    /\b(phishing|credential harvesting|lateral movement|persistence|exfiltration)\b/gi,
  ],
  INDICATOR: [
    /IOC|indicator/gi,
    /hash|SHA256|MD5/gi,
    /[a-fA-F0-9]{32}/g, // MD5
    /[a-fA-F0-9]{64}/g, // SHA256
  ],
  VULNERABILITY: [/CVE-\d{4}-\d+/gi, /vulnerability|exploit|zero-day/gi],
  NARRATIVE: [/disinformation|influence operation|propaganda|narrative/gi],
};

const JAILBREAK_PATTERNS = [
  /ignore (previous|all|prior) instructions/gi,
  /you are now/gi,
  /pretend (to be|you are)/gi,
  /roleplay as/gi,
  /bypass|override|disable/gi,
  /DAN|jailbreak/gi,
];

// =============================================================================
// INTENT ROUTER
// =============================================================================

export interface IntentRouterConfig {
  anthropic: {
    apiKey: string;
  };
  openai: {
    apiKey: string;
  };
  qwen?: {
    apiKey: string;
    baseUrl: string;
  };
  consensusThreshold: number; // Minimum agreement ratio (0-1)
  confidenceThreshold: number; // Minimum confidence to accept
  enableGuardrails: boolean;
}

export class MultiModelIntentRouter {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private qwen?: OpenAI; // Qwen uses OpenAI-compatible API
  private config: IntentRouterConfig;

  constructor(config: IntentRouterConfig) {
    this.config = config;

    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });

    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    if (config.qwen) {
      this.qwen = new OpenAI({
        apiKey: config.qwen.apiKey,
        baseURL: config.qwen.baseUrl,
      });
    }
  }

  // ===========================================================================
  // CORE ROUTING
  // ===========================================================================

  /**
   * Route a query through multi-model consensus
   */
  async routeIntent(
    query: string,
    context: ContextChunk[],
    securityContext: SecurityContext,
  ): Promise<AggregatedIntent> {
    // Step 1: Check guardrails
    const guardrailFlags = this.config.enableGuardrails ? this.checkGuardrails(query) : [];

    if (guardrailFlags.some((f) => f.action === 'block')) {
      return {
        primaryIntent: 'blocked',
        confidence: 0,
        consensusScore: 0,
        dissent: [],
        osintEntities: [],
        rankedContext: context,
        guardrailFlags,
      };
    }

    // Step 2: Extract OSINT entities
    const osintEntities = this.extractOSINTEntities(query);

    // Step 3: Run parallel intent classification
    const intentResults = await this.classifyIntentParallel(query, context);

    // Step 4: Aggregate via confidence voting
    const aggregated = this.aggregateIntents(intentResults);

    // Step 5: Re-rank context by relevance to intent
    const rankedContext = this.rerankContext(context, aggregated.primaryIntent, osintEntities);

    return {
      ...aggregated,
      osintEntities,
      rankedContext,
      guardrailFlags,
    };
  }

  // ===========================================================================
  // PARALLEL CLASSIFICATION
  // ===========================================================================

  private async classifyIntentParallel(
    query: string,
    context: ContextChunk[],
  ): Promise<IntentResult[]> {
    const contextStr = context
      .slice(0, 5)
      .map((c) => c.content)
      .join('\n');

    const systemPrompt = `You are an intelligence analyst assistant. Classify the user's intent into exactly one of these categories:
${INTENT_CATEGORIES.map((c) => `- ${c}`).join('\n')}

Respond with JSON: {"intent": "<category>", "confidence": <0-1>}`;

    const userPrompt = `Context:\n${contextStr}\n\nQuery: ${query}`;

    const promises: Promise<IntentResult>[] = [
      this.classifyWithClaude(systemPrompt, userPrompt),
      this.classifyWithGPT(systemPrompt, userPrompt),
    ];

    if (this.qwen) {
      promises.push(this.classifyWithQwen(systemPrompt, userPrompt));
    }

    const results = await Promise.allSettled(promises);

    return results
      .filter((r): r is PromiseFulfilledResult<IntentResult> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  private async classifyWithClaude(systemPrompt: string, userPrompt: string): Promise<IntentResult> {
    const start = Date.now();

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const latencyMs = Date.now() - start;
    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const parsed = JSON.parse(text);
      return {
        intent: parsed.intent,
        confidence: parsed.confidence,
        model: 'claude-sonnet-4',
        latencyMs,
        entities: [],
        rawResponse: text,
      };
    } catch {
      return {
        intent: 'general_query',
        confidence: 0.3,
        model: 'claude-sonnet-4',
        latencyMs,
        entities: [],
        rawResponse: text,
      };
    }
  }

  private async classifyWithGPT(systemPrompt: string, userPrompt: string): Promise<IntentResult> {
    const start = Date.now();

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      max_tokens: 100,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const latencyMs = Date.now() - start;
    const text = response.choices[0]?.message?.content ?? '';

    try {
      const parsed = JSON.parse(text);
      return {
        intent: parsed.intent,
        confidence: parsed.confidence,
        model: 'gpt-4-turbo',
        latencyMs,
        entities: [],
        rawResponse: text,
      };
    } catch {
      return {
        intent: 'general_query',
        confidence: 0.3,
        model: 'gpt-4-turbo',
        latencyMs,
        entities: [],
        rawResponse: text,
      };
    }
  }

  private async classifyWithQwen(systemPrompt: string, userPrompt: string): Promise<IntentResult> {
    if (!this.qwen) {
      throw new Error('Qwen not configured');
    }

    const start = Date.now();

    const response = await this.qwen.chat.completions.create({
      model: 'qwen2.5-72b-instruct',
      max_tokens: 100,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const latencyMs = Date.now() - start;
    const text = response.choices[0]?.message?.content ?? '';

    try {
      const parsed = JSON.parse(text);
      return {
        intent: parsed.intent,
        confidence: parsed.confidence,
        model: 'qwen2.5-72b',
        latencyMs,
        entities: [],
        rawResponse: text,
      };
    } catch {
      return {
        intent: 'general_query',
        confidence: 0.3,
        model: 'qwen2.5-72b',
        latencyMs,
        entities: [],
        rawResponse: text,
      };
    }
  }

  // ===========================================================================
  // AGGREGATION
  // ===========================================================================

  private aggregateIntents(
    results: IntentResult[],
  ): Omit<AggregatedIntent, 'osintEntities' | 'rankedContext' | 'guardrailFlags'> {
    if (results.length === 0) {
      return {
        primaryIntent: 'general_query',
        confidence: 0,
        consensusScore: 0,
        dissent: [],
      };
    }

    // Count votes weighted by confidence
    const voteWeights: Record<string, number> = {};
    let totalWeight = 0;

    for (const result of results) {
      voteWeights[result.intent] = (voteWeights[result.intent] ?? 0) + result.confidence;
      totalWeight += result.confidence;
    }

    // Find winner
    const sortedIntents = Object.entries(voteWeights).sort(([, a], [, b]) => b - a);
    const [primaryIntent, primaryWeight] = sortedIntents[0];

    // Calculate consensus score (agreement ratio)
    const agreeing = results.filter((r) => r.intent === primaryIntent);
    const consensusScore = agreeing.length / results.length;

    // Average confidence of agreeing models
    const confidence = agreeing.reduce((sum, r) => sum + r.confidence, 0) / agreeing.length;

    // Dissenting models
    const dissent = results.filter((r) => r.intent !== primaryIntent);

    return {
      primaryIntent,
      confidence,
      consensusScore,
      dissent,
    };
  }

  // ===========================================================================
  // OSINT ENTITY EXTRACTION
  // ===========================================================================

  private extractOSINTEntities(query: string): OSINTEntity[] {
    const entities: OSINTEntity[] = [];

    for (const [entityType, patterns] of Object.entries(OSINT_ENTITY_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = query.matchAll(pattern);
        for (const match of matches) {
          // Avoid duplicates
          if (!entities.some((e) => e.value === match[0] && e.type === entityType)) {
            entities.push({
              type: entityType as OSINTEntityType,
              value: match[0],
              confidence: this.calculateEntityConfidence(entityType as OSINTEntityType, match[0]),
              source: 'regex',
            });
          }
        }
      }
    }

    return entities;
  }

  private calculateEntityConfidence(type: OSINTEntityType, value: string): number {
    // Higher confidence for more specific patterns
    switch (type) {
      case 'THREAT_ACTOR':
        // APT numbers and known group names are high confidence
        return /APT\d+/i.test(value) ? 0.95 : 0.85;
      case 'TTP':
        // MITRE IDs are very high confidence
        return /T\d{4}/.test(value) ? 0.98 : 0.7;
      case 'VULNERABILITY':
        return /CVE-\d{4}-\d+/i.test(value) ? 0.99 : 0.6;
      case 'INDICATOR':
        // Hashes are high confidence
        return /[a-fA-F0-9]{32,64}/.test(value) ? 0.95 : 0.6;
      case 'INFRASTRUCTURE':
        // IP addresses high, domains lower
        return /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(value) ? 0.9 : 0.7;
      default:
        return 0.6;
    }
  }

  // ===========================================================================
  // CONTEXT RE-RANKING
  // ===========================================================================

  private rerankContext(
    context: ContextChunk[],
    intent: string,
    entities: OSINTEntity[],
  ): ContextChunk[] {
    const entityValues = new Set(entities.map((e) => e.value.toLowerCase()));

    return context
      .map((chunk) => {
        let boost = 0;

        // Boost for entity co-occurrence
        for (const entity of entityValues) {
          if (chunk.content.toLowerCase().includes(entity)) {
            boost += 0.2;
          }
        }

        // Boost for intent-related keywords
        const intentKeywords = this.getIntentKeywords(intent);
        for (const keyword of intentKeywords) {
          if (chunk.content.toLowerCase().includes(keyword)) {
            boost += 0.1;
          }
        }

        // Recency boost
        const ageMs = Date.now() - chunk.timestamp.getTime();
        const recencyBoost = Math.max(0, 1 - ageMs / (24 * 60 * 60 * 1000)) * 0.1;

        return {
          ...chunk,
          relevanceScore: Math.min(1, chunk.relevanceScore + boost + recencyBoost),
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private getIntentKeywords(intent: string): string[] {
    const keywordMap: Record<string, string[]> = {
      entity_lookup: ['entity', 'who', 'what', 'find', 'search', 'lookup'],
      path_finding: ['path', 'connection', 'link', 'between', 'relationship', 'hop'],
      threat_assessment: ['threat', 'risk', 'danger', 'attack', 'vulnerable', 'assess'],
      timeline_analysis: ['timeline', 'when', 'history', 'sequence', 'chronology'],
      relationship_mapping: ['relationship', 'network', 'map', 'graph', 'connected'],
      report_generation: ['report', 'summary', 'brief', 'document', 'generate'],
      alert_creation: ['alert', 'notify', 'watch', 'monitor', 'trigger'],
      data_export: ['export', 'download', 'extract', 'csv', 'json'],
      investigation_create: ['investigation', 'case', 'new', 'open', 'start'],
      general_query: [],
    };

    return keywordMap[intent] ?? [];
  }

  // ===========================================================================
  // GUARDRAILS
  // ===========================================================================

  private checkGuardrails(query: string): GuardrailFlag[] {
    const flags: GuardrailFlag[] = [];

    // Check for jailbreak attempts
    for (const pattern of JAILBREAK_PATTERNS) {
      if (pattern.test(query)) {
        flags.push({
          type: 'JAILBREAK_ATTEMPT',
          severity: 'high',
          description: `Potential jailbreak pattern detected: ${pattern.source}`,
          action: 'block',
        });
      }
    }

    // Check for PII patterns (simple examples)
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
    if (ssnPattern.test(query)) {
      flags.push({
        type: 'PII_DETECTED',
        severity: 'high',
        description: 'Potential SSN detected in query',
        action: 'warn',
      });
    }

    return flags;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createIntentRouter(config: IntentRouterConfig): MultiModelIntentRouter {
  return new MultiModelIntentRouter(config);
}
