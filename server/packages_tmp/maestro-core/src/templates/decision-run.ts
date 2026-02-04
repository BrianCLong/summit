/**
 * Maestro Decision Run Template
 * Workflow template for automated decision analysis with provenance
 */

import { v4 as uuid } from 'uuid';
import type {
  WorkflowDefinition,
  WorkflowStep,
  StepPlugin,
  RunContext,
  StepExecution,
} from '../engine.js';

/**
 * Decision Analysis Run - Workflow Definition
 *
 * This workflow template orchestrates a complete decision analysis:
 * 1. Fetch relevant entities and context
 * 2. Gather claims about entities
 * 3. Collect and validate evidence
 * 4. Run AI analysis to generate recommendation
 * 5. Create decision record with full provenance
 * 6. Generate disclosure pack
 * 7. Route for approval if required
 */
export const DecisionAnalysisWorkflow: WorkflowDefinition = {
  name: 'decision-analysis-run',
  version: '1.0.0',
  global_timeout_ms: 300000, // 5 minutes
  on_failure: 'compensate',
  steps: [
    {
      id: 'validate-input',
      name: 'Validate Decision Input',
      plugin: 'input-validator',
      config: {
        schema: 'decision-run-input',
        required_fields: ['question', 'entity_ids'],
      },
      retry: { max_attempts: 1, backoff_ms: 0, exponential: false },
      timeout_ms: 5000,
    },
    {
      id: 'fetch-entities',
      name: 'Fetch Entity Context',
      plugin: 'graph-query',
      config: {
        query_type: 'entities',
        include_relationships: true,
        depth: 2,
      },
      depends_on: ['validate-input'],
      retry: { max_attempts: 3, backoff_ms: 1000, exponential: true },
      timeout_ms: 30000,
    },
    {
      id: 'gather-claims',
      name: 'Gather Related Claims',
      plugin: 'graph-query',
      config: {
        query_type: 'claims',
        filter_by_entities: true,
        include_confidence: true,
        min_confidence: 0.3,
      },
      depends_on: ['fetch-entities'],
      retry: { max_attempts: 3, backoff_ms: 1000, exponential: true },
      timeout_ms: 30000,
    },
    {
      id: 'collect-evidence',
      name: 'Collect Supporting Evidence',
      plugin: 'evidence-collector',
      config: {
        max_items: 20,
        verify_hashes: true,
        check_freshness: true,
        max_age_days: 365,
      },
      depends_on: ['gather-claims'],
      retry: { max_attempts: 2, backoff_ms: 2000, exponential: true },
      timeout_ms: 60000,
    },
    {
      id: 'ai-analysis',
      name: 'Run AI Analysis',
      plugin: 'ai-reasoner',
      config: {
        model: 'claude-3-5-sonnet',
        temperature: 0.3,
        max_tokens: 4000,
        system_prompt: 'decision-analysis',
        output_format: 'structured',
      },
      depends_on: ['collect-evidence'],
      retry: { max_attempts: 2, backoff_ms: 5000, exponential: true },
      timeout_ms: 120000,
      compensation: {
        plugin: 'ai-reasoner',
        config: { action: 'cancel' },
      },
    },
    {
      id: 'create-decision',
      name: 'Create Decision Record',
      plugin: 'decision-creator',
      config: {
        include_provenance: true,
        link_claims: true,
        link_evidence: true,
        compute_hash: true,
      },
      depends_on: ['ai-analysis'],
      retry: { max_attempts: 3, backoff_ms: 1000, exponential: true },
      timeout_ms: 30000,
    },
    {
      id: 'generate-disclosure',
      name: 'Generate Disclosure Pack',
      plugin: 'disclosure-generator',
      config: {
        format: 'markdown',
        include_audit_trail: true,
        compute_merkle_root: true,
      },
      depends_on: ['create-decision'],
      retry: { max_attempts: 2, backoff_ms: 1000, exponential: false },
      timeout_ms: 30000,
    },
    {
      id: 'route-approval',
      name: 'Route for Approval',
      plugin: 'approval-router',
      config: {
        check_confidence_threshold: true,
        confidence_threshold: 0.7,
        auto_approve_high_confidence: false,
        notification_channels: ['email', 'slack'],
      },
      depends_on: ['generate-disclosure'],
      retry: { max_attempts: 3, backoff_ms: 2000, exponential: true },
      timeout_ms: 30000,
    },
  ],
};

// ============================================================================
// Plugin Implementations
// ============================================================================

/**
 * Input Validator Plugin
 */
export const InputValidatorPlugin: StepPlugin = {
  name: 'input-validator',

  validate(config: any): void {
    if (!config.schema) {
      throw new Error('Input validator requires schema');
    }
  },

  async execute(context: RunContext, step: WorkflowStep, execution: StepExecution) {
    const { parameters } = context;
    const { required_fields } = step.config;

    // Validate required fields
    const missing = required_fields.filter((f: string) => !parameters[f]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate question length
    if (parameters.question && parameters.question.length > 2000) {
      throw new Error('Question exceeds maximum length of 2000 characters');
    }

    // Validate entity IDs format
    if (parameters.entity_ids) {
      for (const id of parameters.entity_ids) {
        if (!id.match(/^entity_[0-9a-f-]+$/)) {
          throw new Error(`Invalid entity ID format: ${id}`);
        }
      }
    }

    return {
      output: {
        validated: true,
        parameters: parameters,
      },
      metadata: {
        fields_validated: required_fields.length,
      },
    };
  },
};

/**
 * Graph Query Plugin
 */
export const GraphQueryPlugin: StepPlugin = {
  name: 'graph-query',

  validate(config: any): void {
    if (!config.query_type) {
      throw new Error('Graph query requires query_type');
    }
  },

  async execute(context: RunContext, step: WorkflowStep, execution: StepExecution) {
    const { parameters, tenant_id } = context;
    const { query_type, include_relationships, depth, filter_by_entities, min_confidence } = step.config;

    // Simulated graph query - in production, call decision-api
    const apiUrl = process.env.DECISION_API_URL || 'http://localhost:4020';

    if (query_type === 'entities') {
      const entities = await fetchEntities(apiUrl, parameters.entity_ids, tenant_id);
      return {
        output: {
          entities,
          count: entities.length,
        },
        metadata: {
          query_type,
          depth,
        },
      };
    }

    if (query_type === 'claims') {
      const claims = await fetchClaimsForEntities(
        apiUrl,
        parameters.entity_ids,
        tenant_id,
        min_confidence,
      );
      return {
        output: {
          claims,
          count: claims.length,
        },
        metadata: {
          query_type,
          min_confidence,
        },
      };
    }

    throw new Error(`Unknown query type: ${query_type}`);
  },
};

/**
 * Evidence Collector Plugin
 */
export const EvidenceCollectorPlugin: StepPlugin = {
  name: 'evidence-collector',

  validate(config: any): void {
    if (config.max_items && config.max_items > 100) {
      throw new Error('max_items cannot exceed 100');
    }
  },

  async execute(context: RunContext, step: WorkflowStep, execution: StepExecution) {
    const { max_items, verify_hashes, check_freshness, max_age_days } = step.config;

    // Get claims from previous step
    const previousOutput = context.parameters._step_outputs?.['gather-claims'];
    const claims = previousOutput?.claims || [];

    // Collect evidence IDs from claims
    const evidenceIds = new Set<string>();
    for (const claim of claims) {
      for (const eid of claim.evidence_ids || []) {
        evidenceIds.add(eid);
      }
    }

    // Fetch evidence (limited)
    const apiUrl = process.env.DECISION_API_URL || 'http://localhost:4020';
    const evidence = await fetchEvidence(
      apiUrl,
      Array.from(evidenceIds).slice(0, max_items),
      context.tenant_id,
    );

    // Filter by freshness if enabled
    let filteredEvidence = evidence;
    if (check_freshness && max_age_days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - max_age_days);
      filteredEvidence = evidence.filter((e: any) =>
        new Date(e.freshness_date) >= cutoffDate,
      );
    }

    return {
      output: {
        evidence: filteredEvidence,
        count: filteredEvidence.length,
        filtered_count: evidence.length - filteredEvidence.length,
      },
      metadata: {
        hashes_verified: verify_hashes,
        freshness_checked: check_freshness,
      },
    };
  },
};

/**
 * AI Reasoner Plugin
 */
export const AIReasonerPlugin: StepPlugin = {
  name: 'ai-reasoner',

  validate(config: any): void {
    if (!config.model) {
      throw new Error('AI reasoner requires model');
    }
  },

  async execute(context: RunContext, step: WorkflowStep, execution: StepExecution) {
    const { model, temperature, max_tokens } = step.config;
    const { parameters } = context;

    // Get context from previous steps
    const entities = context.parameters._step_outputs?.['fetch-entities']?.entities || [];
    const claims = context.parameters._step_outputs?.['gather-claims']?.claims || [];
    const evidence = context.parameters._step_outputs?.['collect-evidence']?.evidence || [];

    // Build prompt
    const systemPrompt = buildDecisionSystemPrompt();
    const userPrompt = buildDecisionUserPrompt(
      parameters.question,
      parameters.context,
      parameters.constraints,
      parameters.options,
      entities,
      claims,
      evidence,
    );

    // Call AI model (simulated - in production use actual API)
    const startTime = Date.now();
    const response = await callAIModel(model, systemPrompt, userPrompt, temperature, max_tokens);
    const duration = Date.now() - startTime;

    // Parse structured response
    const analysis = parseAIResponse(response);

    return {
      output: {
        recommendation: analysis.recommendation,
        rationale: analysis.rationale,
        selected_option: analysis.selected_option,
        confidence_score: analysis.confidence_score,
        risk_factors: analysis.risk_factors,
        limitations: analysis.limitations,
        claims_referenced: analysis.claims_referenced,
      },
      cost_usd: estimateCost(model, response.input_tokens, response.output_tokens),
      metadata: {
        model,
        duration_ms: duration,
        input_tokens: response.input_tokens,
        output_tokens: response.output_tokens,
      },
    };
  },

  async compensate(context: RunContext, step: WorkflowStep, execution: StepExecution) {
    // Cancel any pending AI requests
    console.log('Compensating AI reasoner step');
  },
};

/**
 * Decision Creator Plugin
 */
export const DecisionCreatorPlugin: StepPlugin = {
  name: 'decision-creator',

  validate(config: any): void {
    // No required config
  },

  async execute(context: RunContext, step: WorkflowStep, execution: StepExecution) {
    const { parameters, tenant_id, triggered_by, run_id } = context;

    // Get AI analysis output
    const aiOutput = context.parameters._step_outputs?.['ai-analysis'];
    const claims = context.parameters._step_outputs?.['gather-claims']?.claims || [];
    const evidence = context.parameters._step_outputs?.['collect-evidence']?.evidence || [];

    // Create decision via API
    const apiUrl = process.env.DECISION_API_URL || 'http://localhost:4020';

    const decision = {
      type: parameters.decision_type || 'custom',
      title: parameters.title || `Decision: ${parameters.question.substring(0, 50)}...`,
      question: parameters.question,
      context: parameters.context,
      constraints: parameters.constraints,
      options: parameters.options || generateDefaultOptions(aiOutput),
      entity_ids: parameters.entity_ids,
      recommendation: aiOutput.recommendation,
      rationale: aiOutput.rationale,
      selected_option_id: aiOutput.selected_option?.id,
      confidence_score: aiOutput.confidence_score,
      claim_ids: claims.map((c: any) => c.id),
      evidence_ids: evidence.map((e: any) => e.id),
      risk_assessment: {
        overall_risk: aiOutput.confidence_score > 0.8 ? 'low' : aiOutput.confidence_score > 0.5 ? 'medium' : 'high',
        risk_factors: aiOutput.risk_factors,
        mitigations: [],
      },
      maestro_run_id: run_id,
      decision_maker_type: 'ai',
    };

    // In production, POST to decision-api
    const decisionId = `decision_${uuid()}`;

    return {
      output: {
        decision_id: decisionId,
        decision,
      },
      metadata: {
        claims_linked: claims.length,
        evidence_linked: evidence.length,
      },
    };
  },
};

/**
 * Disclosure Generator Plugin
 */
export const DisclosureGeneratorPlugin: StepPlugin = {
  name: 'disclosure-generator',

  validate(config: any): void {
    // No required config
  },

  async execute(context: RunContext, step: WorkflowStep, execution: StepExecution) {
    const { format, include_audit_trail, compute_merkle_root } = step.config;

    const decisionOutput = context.parameters._step_outputs?.['create-decision'];
    const decision = decisionOutput?.decision;
    const decisionId = decisionOutput?.decision_id;

    if (!decision) {
      throw new Error('No decision found from previous step');
    }

    // Generate disclosure pack
    const packId = `disclosure_${uuid()}`;

    return {
      output: {
        pack_id: packId,
        decision_id: decisionId,
        format,
        generated_at: new Date().toISOString(),
      },
      metadata: {
        format,
        include_audit_trail,
      },
    };
  },
};

/**
 * Approval Router Plugin
 */
export const ApprovalRouterPlugin: StepPlugin = {
  name: 'approval-router',

  validate(config: any): void {
    // No required config
  },

  async execute(context: RunContext, step: WorkflowStep, execution: StepExecution) {
    const { confidence_threshold, auto_approve_high_confidence, notification_channels } = step.config;

    const aiOutput = context.parameters._step_outputs?.['ai-analysis'];
    const decisionOutput = context.parameters._step_outputs?.['create-decision'];

    const confidence = aiOutput?.confidence_score || 0;
    const requiresApproval = context.parameters.require_human_approval !== false;

    let approvalStatus: string;
    if (!requiresApproval) {
      approvalStatus = 'auto_approved_no_review_required';
    } else if (auto_approve_high_confidence && confidence >= confidence_threshold) {
      approvalStatus = 'auto_approved_high_confidence';
    } else {
      approvalStatus = 'pending_approval';
    }

    return {
      output: {
        decision_id: decisionOutput?.decision_id,
        approval_status: approvalStatus,
        confidence_score: confidence,
        requires_human_review: approvalStatus === 'pending_approval',
        notified_channels: approvalStatus === 'pending_approval' ? notification_channels : [],
      },
      metadata: {
        threshold: confidence_threshold,
        auto_approve_enabled: auto_approve_high_confidence,
      },
    };
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchEntities(apiUrl: string, entityIds: string[], tenantId: string): Promise<any[]> {
  // Simulated - in production, call decision-api
  return entityIds.map(id => ({
    id,
    type: 'Entity',
    name: `Entity ${id.substring(7, 15)}`,
    attributes: {},
  }));
}

async function fetchClaimsForEntities(
  apiUrl: string,
  entityIds: string[],
  tenantId: string,
  minConfidence: number,
): Promise<any[]> {
  // Simulated - in production, call decision-api
  return [];
}

async function fetchEvidence(apiUrl: string, evidenceIds: string[], tenantId: string): Promise<any[]> {
  // Simulated - in production, call decision-api
  return [];
}

function buildDecisionSystemPrompt(): string {
  return `You are an expert decision analyst. Your role is to analyze information and provide well-reasoned recommendations.

Guidelines:
1. Base recommendations on evidence and claims provided
2. Explicitly state confidence levels and uncertainty
3. Identify potential risks and limitations
4. Structure your response for clarity
5. Reference specific claims and evidence in your rationale`;
}

function buildDecisionUserPrompt(
  question: string,
  context: string | undefined,
  constraints: string[] | undefined,
  options: any[] | undefined,
  entities: any[],
  claims: any[],
  evidence: any[],
): string {
  let prompt = `## Decision Question\n${question}\n\n`;

  if (context) {
    prompt += `## Context\n${context}\n\n`;
  }

  if (constraints?.length) {
    prompt += `## Constraints\n${constraints.map(c => `- ${c}`).join('\n')}\n\n`;
  }

  if (options?.length) {
    prompt += `## Options to Consider\n${options.map((o, i) => `${i + 1}. ${o.name}: ${o.description}`).join('\n')}\n\n`;
  }

  if (entities.length) {
    prompt += `## Relevant Entities\n${entities.map(e => `- ${e.name} (${e.type})`).join('\n')}\n\n`;
  }

  if (claims.length) {
    prompt += `## Claims\n${claims.map(c => `- [${c.confidence_score}] ${c.assertion}`).join('\n')}\n\n`;
  }

  if (evidence.length) {
    prompt += `## Evidence\n${evidence.map(e => `- ${e.title} (${e.source_type})`).join('\n')}\n\n`;
  }

  prompt += `## Required Output Format
Provide your analysis in the following JSON structure:
{
  "recommendation": "Your clear recommendation",
  "rationale": "Detailed reasoning",
  "selected_option": { "name": "option name", "id": "option_id" },
  "confidence_score": 0.0-1.0,
  "risk_factors": ["risk1", "risk2"],
  "limitations": ["limitation1", "limitation2"],
  "claims_referenced": ["claim_id1", "claim_id2"]
}`;

  return prompt;
}

async function callAIModel(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
): Promise<{ content: string; input_tokens: number; output_tokens: number }> {
  // Simulated - in production, call actual AI API
  return {
    content: JSON.stringify({
      recommendation: 'Based on the analysis, proceed with Option A',
      rationale: 'The evidence supports this choice with high confidence',
      selected_option: { name: 'Option A', id: 'option_1' },
      confidence_score: 0.85,
      risk_factors: ['Limited historical data'],
      limitations: ['Analysis based on available data only'],
      claims_referenced: [],
    }),
    input_tokens: 1500,
    output_tokens: 500,
  };
}

function parseAIResponse(response: { content: string }): any {
  try {
    return JSON.parse(response.content);
  } catch {
    return {
      recommendation: response.content,
      rationale: '',
      confidence_score: 0.5,
      risk_factors: [],
      limitations: ['Could not parse structured response'],
      claims_referenced: [],
    };
  }
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Approximate costs per 1M tokens
  const costs: Record<string, { input: number; output: number }> = {
    'claude-3-5-sonnet': { input: 3, output: 15 },
    'claude-3-opus': { input: 15, output: 75 },
    'gpt-4': { input: 30, output: 60 },
  };

  const modelCost = costs[model] || { input: 5, output: 15 };
  return (inputTokens * modelCost.input + outputTokens * modelCost.output) / 1000000;
}

function generateDefaultOptions(aiOutput: any): any[] {
  return [
    {
      id: `option_${uuid()}`,
      name: 'Proceed',
      description: 'Accept the recommendation and proceed',
      risk_level: 'low',
      selected: true,
    },
    {
      id: `option_${uuid()}`,
      name: 'Defer',
      description: 'Defer decision pending additional review',
      risk_level: 'low',
      selected: false,
    },
    {
      id: `option_${uuid()}`,
      name: 'Reject',
      description: 'Reject the recommendation',
      risk_level: 'medium',
      selected: false,
    },
  ];
}

// Export all plugins
export const DecisionRunPlugins = {
  'input-validator': InputValidatorPlugin,
  'graph-query': GraphQueryPlugin,
  'evidence-collector': EvidenceCollectorPlugin,
  'ai-reasoner': AIReasonerPlugin,
  'decision-creator': DecisionCreatorPlugin,
  'disclosure-generator': DisclosureGeneratorPlugin,
  'approval-router': ApprovalRouterPlugin,
};
