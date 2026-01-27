
import { logger } from '../utils/logger.js';

export type IntentType = 'retrieval' | 'action' | 'clarification' | 'off_topic';

export interface FreshnessRequirement {
  max_age_days?: number;
  requires_live?: boolean;
}

export interface IntentResult {
  primary_intent: IntentType;
  sub_intent?: string;
  confidence: number;
  entities: string[];
  allowed_sources?: string[];
  freshness_requirement?: FreshnessRequirement;
  reasoning?: string;
  clarifying_question?: string;
}

export class IntentClassificationService {
  constructor() {}

  async classify(query: string, context: any = {}): Promise<IntentResult> {
    const q = query.toLowerCase().trim();
    logger.info({ query: q }, 'Classifying intent');

    // 1. Check for clarification (Ambiguity / Low Information)
    if (q.split(' ').length < 2 && !['help', 'status'].includes(q)) {
      return {
        primary_intent: 'clarification',
        confidence: 0.9,
        entities: [],
        reasoning: 'Query is too short to determine intent.',
        clarifying_question: `Could you specify what you want to know about "${query}"?`
      };
    }

    // 2. Check for Actions
    const actionKeywords = ['cancel', 'create', 'delete', 'update', 'run', 'start', 'escalate', 'approve', 'reject'];
    if (actionKeywords.some(k => q.startsWith(k))) {
      return this.classifyAction(q);
    }

    // 3. Check for Retrieval
    const retrievalKeywords = ['what', 'who', 'when', 'where', 'how', 'list', 'show', 'describe', 'find', 'status', 'check', 'search'];
    if (retrievalKeywords.some(k => q.startsWith(k)) || q.includes('?')) {
      return this.classifyRetrieval(q);
    }

    // Default to Retrieval if unsure but looks like a query, otherwise Off-topic/Clarification
    if (q.length > 5) {
      return this.classifyRetrieval(q);
    }

    return {
      primary_intent: 'clarification',
      confidence: 0.5,
      entities: [],
      reasoning: 'Unsure of intent.',
      clarifying_question: 'I am not sure how to help. Are you trying to search for information or perform an action?'
    };
  }

  private classifyAction(q: string): IntentResult {
    const parts = q.split(' ');
    const action = parts[0];
    const entities = parts.slice(1).filter(w => w.length > 3); // Naive entity extraction

    return {
      primary_intent: 'action',
      sub_intent: action,
      confidence: 0.85,
      entities,
      reasoning: `Detected action keyword "${action}"`
    };
  }

  private classifyRetrieval(q: string): IntentResult {
    const result: IntentResult = {
      primary_intent: 'retrieval',
      confidence: 0.9,
      entities: [], // TODO: Use NER
      allowed_sources: [],
      freshness_requirement: {}
    };

    // Determine constraints
    if (q.includes('policy') || q.includes('compliance') || q.includes('rule')) {
      result.allowed_sources = ['confluence', 'google_drive', 'notion'];
      result.sub_intent = 'policy_search';
    } else if (q.includes('incident') || q.includes('status') || q.includes('health')) {
      result.allowed_sources = ['pagerduty', 'statuspage', 'jira'];
      result.sub_intent = 'operational_status';
    } else {
      result.allowed_sources = ['all']; // Default
      result.sub_intent = 'general_knowledge';
    }

    // Freshness
    if (q.includes('now') || q.includes('current') || q.includes('latest') || q.includes('today')) {
      result.freshness_requirement = {
        max_age_days: 1,
        requires_live: true
      };
    } else if (q.includes('history') || q.includes('past') || q.includes('last year')) {
      result.freshness_requirement = {
        max_age_days: 365
      };
    } else {
      result.freshness_requirement = {
        max_age_days: 30 // Default
      };
    }

    return result;
  }
}
