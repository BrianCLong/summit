import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { z } from 'zod';

// Safety v2 types per Chair's synthesis
interface ActionRisk {
  sensitivity: number; // Data sensitivity score
  blastRadius: number; // Potential impact scope
  reversibility: number; // How hard to undo (1 = irreversible)
  tenantPosture: number; // Tenant security posture
}

interface SemanticGuardrail {
  id: string;
  type:
    | 'pii'
    | 'toxicity'
    | 'jailbreak'
    | 'prompt-injection'
    | 'bias'
    | 'misinformation';
  enabled: boolean;
  threshold: number;
  action: 'block' | 'warn' | 'log' | 'escalate';
  watchlistPatterns: string[];
  customRules?: string[];
}

interface SafetyEvaluation {
  actionId: string;
  riskScore: number;
  guardrailViolations: string[];
  citationCoverage: number;
  approvalRequired: boolean;
  decision: 'allow' | 'require_approval' | 'deny' | 'escalate';
  reasoning: string[];
}

const ActionRequestSchema = z.object({
  actionId: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  actionType: z.string(),
  inputText: z.string(),
  outputText: z.string().optional(),
  dataClassification: z.enum([
    'public',
    'internal',
    'confidential',
    'restricted',
    'top-secret',
  ]),
  targetResources: z.array(z.string()),
  metadata: z
    .object({
      reversible: z.boolean().default(true),
      external: z.boolean().default(false),
      containsPII: z.boolean().default(false),
      requiresCitation: z.boolean().default(true),
    })
    .optional(),
});

const GuardrailConfigSchema = z.object({
  type: z.enum([
    'pii',
    'toxicity',
    'jailbreak',
    'prompt-injection',
    'bias',
    'misinformation',
  ]),
  enabled: z.boolean(),
  threshold: z.number().min(0).max(1),
  action: z.enum(['block', 'warn', 'log', 'escalate']),
  watchlistPatterns: z.array(z.string()),
  customRules: z.array(z.string()).optional(),
});

export class SafetyV2Service {
  private watchlists: Map<string, Set<string>> = new Map();
  private guardrails: Map<string, SemanticGuardrail> = new Map();
  private citationRequiredActions = new Set([
    'research',
    'analysis',
    'recommendation',
    'decision',
  ]);

  constructor() {
    this.initializeWatchlists();
    this.initializeGuardrails();
    this.startWatchlistUpdates();
  }

  private initializeWatchlists() {
    // Initialize prompt injection watchlist
    const promptInjectionPatterns = [
      'ignore previous instructions',
      'disregard the above',
      'forget everything before',
      'new instructions:',
      'system: you are now',
      'DAN mode',
      'jailbreak mode',
      'developer mode',
      'simulate being',
      'roleplay as',
      'pretend you are',
    ];

    this.watchlists.set('prompt-injection', new Set(promptInjectionPatterns));

    // PII patterns
    const piiPatterns = [
      // Credit cards
      '\\b4[0-9]{12}(?:[0-9]{3})?\\b', // Visa
      '\\b5[1-5][0-9]{14}\\b', // MasterCard
      '\\b3[47][0-9]{13}\\b', // American Express
      // SSN patterns
      '\\b\\d{3}-\\d{2}-\\d{4}\\b',
      '\\b\\d{9}\\b',
      // Email patterns
      '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
      // Phone numbers
      '\\b\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}\\b',
    ];

    this.watchlists.set('pii', new Set(piiPatterns));

    // Toxicity keywords
    const toxicityPatterns = [
      'hate',
      'violence',
      'harmful',
      'offensive',
      'discriminatory',
      'racist',
      'sexist',
      'homophobic',
      'xenophobic',
      'threatening',
    ];

    this.watchlists.set('toxicity', new Set(toxicityPatterns));

    // Bias indicators
    const biasPatterns = [
      'all women',
      'all men',
      'typical',
      'always',
      'never',
      'because of their race',
      'because of their gender',
      'inherently better',
      'naturally superior',
    ];

    this.watchlists.set('bias', new Set(biasPatterns));
  }

  private initializeGuardrails() {
    const defaultGuardrails: SemanticGuardrail[] = [
      {
        id: 'pii-detection',
        type: 'pii',
        enabled: true,
        threshold: 0.8,
        action: 'warn',
        watchlistPatterns: Array.from(this.watchlists.get('pii') || []),
      },
      {
        id: 'toxicity-filter',
        type: 'toxicity',
        enabled: true,
        threshold: 0.9,
        action: 'block',
        watchlistPatterns: Array.from(this.watchlists.get('toxicity') || []),
      },
      {
        id: 'prompt-injection-guard',
        type: 'prompt-injection',
        enabled: true,
        threshold: 0.95,
        action: 'block',
        watchlistPatterns: Array.from(
          this.watchlists.get('prompt-injection') || [],
        ),
      },
      {
        id: 'bias-detection',
        type: 'bias',
        enabled: true,
        threshold: 0.7,
        action: 'warn',
        watchlistPatterns: Array.from(this.watchlists.get('bias') || []),
      },
    ];

    defaultGuardrails.forEach((guardrail) => {
      this.guardrails.set(guardrail.id, guardrail);
    });
  }

  private startWatchlistUpdates() {
    // Update watchlists hourly per Chair's requirement
    setInterval(
      async () => {
        try {
          await this.updateWatchlists();
        } catch (error) {
          console.error('Failed to update watchlists:', error);
        }
      },
      60 * 60 * 1000,
    ); // 1 hour
  }

  /**
   * Evaluate action safety with dynamic risk scoring (Chair's OPA policy)
   */
  async evaluateActionSafety(request: any): Promise<SafetyEvaluation> {
    const span = otelService.createSpan('safety-v2.evaluate-action');

    try {
      const validatedRequest = ActionRequestSchema.parse(request);

      // Calculate action risk score
      const riskScore = await this.calculateActionRiskScore(validatedRequest);

      // Run semantic guardrails
      const guardrailViolations = await this.runSemanticGuardrails(
        validatedRequest.inputText,
        validatedRequest.outputText || '',
        validatedRequest.tenantId,
      );

      // Check citation coverage
      const citationCoverage = await this.evaluateCitationCoverage(
        validatedRequest.inputText,
        validatedRequest.outputText || '',
      );

      // Apply OPA-style decision logic from Chair's policy
      let decision: SafetyEvaluation['decision'];
      let reasoning: string[] = [];

      if (riskScore >= 0.7) {
        decision = 'deny';
        reasoning.push('High risk score exceeds maximum threshold');
      } else if (riskScore >= 0.35 || guardrailViolations.length > 0) {
        decision = 'require_approval';
        reasoning.push('Medium risk score requires approval');
        if (guardrailViolations.length > 0) {
          reasoning.push(
            `Guardrail violations: ${guardrailViolations.join(', ')}`,
          );
        }
      } else {
        decision = 'allow';
        reasoning.push('Low risk score within acceptable limits');
      }

      // Citation requirement check
      if (
        this.requiresCitation(validatedRequest.actionType) &&
        citationCoverage < 0.5
      ) {
        if (decision === 'allow') {
          decision = 'require_approval';
        }
        reasoning.push('Insufficient citation coverage for factual claims');
      }

      // High-risk escalation for restricted data
      if (
        validatedRequest.dataClassification === 'top-secret' &&
        decision !== 'deny'
      ) {
        decision = 'escalate';
        reasoning.push('Top-secret data requires human escalation');
      }

      const evaluation: SafetyEvaluation = {
        actionId: validatedRequest.actionId,
        riskScore,
        guardrailViolations,
        citationCoverage,
        approvalRequired:
          decision === 'require_approval' || decision === 'escalate',
        decision,
        reasoning,
      };

      // Store evaluation audit
      await this.storeEvaluationAudit(validatedRequest, evaluation);

      otelService.addSpanAttributes({
        'safety.action_id': validatedRequest.actionId,
        'safety.tenant_id': validatedRequest.tenantId,
        'safety.risk_score': riskScore,
        'safety.decision': decision,
        'safety.guardrail_violations': guardrailViolations.length,
        'safety.citation_coverage': citationCoverage,
      });

      return evaluation;
    } catch (error: any) {
      console.error('Safety evaluation failed:', error);
      otelService.recordException(error);
      throw error;
    } finally {
      span?.end();
    }
  }

  /**
   * Calculate action risk score using Chair's formula:
   * risk = sensitivity × blast × reversibility × tenant
   */
  private async calculateActionRiskScore(request: any): Promise<number> {
    // Data sensitivity based on classification
    const sensitivityMap = {
      public: 0.1,
      internal: 0.3,
      confidential: 0.6,
      restricted: 0.8,
      'top-secret': 1.0,
    };

    const sensitivity = sensitivityMap[request.dataClassification] || 0.5;

    // Blast radius based on action type and target resources
    let blastRadius = 0.1; // Base blast radius

    if (request.targetResources.length > 10) blastRadius += 0.2;
    if (request.targetResources.length > 100) blastRadius += 0.3;

    if (request.metadata?.external) blastRadius += 0.3;
    if (request.metadata?.containsPII) blastRadius += 0.2;

    // Action-specific blast radius
    const highBlastActions = ['delete', 'publish', 'execute', 'transfer'];
    if (
      highBlastActions.some((action) => request.actionType.includes(action))
    ) {
      blastRadius += 0.4;
    }

    // Reversibility (1 = irreversible, 0 = fully reversible)
    let reversibility = request.metadata?.reversible === false ? 0.8 : 0.2;

    if (request.actionType.includes('delete')) reversibility += 0.3;
    if (request.actionType.includes('publish')) reversibility += 0.2;
    if (request.actionType.includes('transfer')) reversibility += 0.4;

    // Tenant posture (get from tenant configuration)
    const tenantPosture = await this.getTenantSecurityPosture(request.tenantId);

    // Apply Chair's formula
    const riskScore = Math.min(
      1.0,
      sensitivity * blastRadius * reversibility * tenantPosture,
    );

    return riskScore;
  }

  /**
   * Run semantic guardrails against input/output text
   */
  private async runSemanticGuardrails(
    inputText: string,
    outputText: string,
    tenantId: string,
  ): Promise<string[]> {
    const violations: string[] = [];
    const allText = `${inputText} ${outputText}`.toLowerCase();

    // Get tenant-specific guardrail config
    const tenantGuardrails = await this.getTenantGuardrails(tenantId);

    for (const guardrail of tenantGuardrails.values()) {
      if (!guardrail.enabled) continue;

      let violationScore = 0;
      let matchCount = 0;

      // Check against watchlist patterns
      for (const pattern of guardrail.watchlistPatterns) {
        const regex = new RegExp(pattern, 'gi');
        const matches = allText.match(regex);
        if (matches) {
          matchCount += matches.length;
          violationScore += matches.length * 0.1;
        }
      }

      // Semantic analysis based on guardrail type
      violationScore += await this.getSemanticScore(allText, guardrail.type);

      if (violationScore >= guardrail.threshold) {
        violations.push(guardrail.id);

        // Log guardrail violation
        await this.logGuardrailViolation(tenantId, guardrail.id, {
          violationScore,
          matchCount,
          action: guardrail.action,
          textLength: allText.length,
        });
      }
    }

    return violations;
  }

  /**
   * Evaluate citation coverage for factual claims
   */
  private async evaluateCitationCoverage(
    inputText: string,
    outputText: string,
  ): Promise<number> {
    if (!outputText) return 1.0; // No output to evaluate

    // Simple citation coverage analysis
    const factualIndicators = [
      'studies show',
      'research indicates',
      'according to',
      'data shows',
      'statistics reveal',
      'evidence suggests',
      'reported that',
      'found that',
      'analysis shows',
      'survey found',
      'study concluded',
      'research found',
    ];

    const citationPatterns = [
      '\\[\\d+\\]', // [1], [2], etc.
      '\\(.*?\\d{4}.*?\\)', // (Author, 2023)
      'https?://[^\\s]+', // URLs
      'doi:\\S+', // DOI references
    ];

    let factualClaims = 0;
    let citations = 0;

    // Count factual claims
    factualIndicators.forEach((indicator) => {
      const regex = new RegExp(indicator, 'gi');
      const matches = outputText.match(regex);
      if (matches) factualClaims += matches.length;
    });

    // Count citations
    citationPatterns.forEach((pattern) => {
      const regex = new RegExp(pattern, 'gi');
      const matches = outputText.match(regex);
      if (matches) citations += matches.length;
    });

    if (factualClaims === 0) return 1.0; // No factual claims to cite

    const coverage = Math.min(1.0, citations / factualClaims);
    return coverage;
  }

  private async getSemanticScore(
    text: string,
    guardrailType: SemanticGuardrail['type'],
  ): Promise<number> {
    // Simplified semantic analysis - in production, use ML models
    switch (guardrailType) {
      case 'toxicity':
        return this.analyzeToxicity(text);
      case 'bias':
        return this.analyzeBias(text);
      case 'pii':
        return this.analyzePII(text);
      case 'jailbreak':
        return this.analyzeJailbreak(text);
      case 'prompt-injection':
        return this.analyzePromptInjection(text);
      case 'misinformation':
        return this.analyzeMisinformation(text);
      default:
        return 0;
    }
  }

  private analyzeToxicity(text: string): number {
    // Simple toxicity analysis
    const toxicWords = [
      'hate',
      'violence',
      'harm',
      'attack',
      'kill',
      'destroy',
    ];
    let score = 0;

    toxicWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) score += matches.length * 0.2;
    });

    return Math.min(1.0, score);
  }

  private analyzeBias(text: string): number {
    // Simple bias detection
    const biasIndicators = [
      'all women',
      'all men',
      'typical for',
      'naturally better',
      'inherently superior',
      'always true that',
      'never the case',
    ];

    let score = 0;
    biasIndicators.forEach((indicator) => {
      const regex = new RegExp(indicator, 'gi');
      const matches = text.match(regex);
      if (matches) score += matches.length * 0.3;
    });

    return Math.min(1.0, score);
  }

  private analyzePII(text: string): number {
    // PII pattern matching
    const piiPatterns = this.watchlists.get('pii') || new Set();
    let score = 0;

    for (const pattern of piiPatterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = text.match(regex);
      if (matches) score += matches.length * 0.4;
    }

    return Math.min(1.0, score);
  }

  private analyzeJailbreak(text: string): number {
    // Jailbreak attempt detection
    const jailbreakPatterns = [
      'ignore.*instructions',
      'forget.*rules',
      'new.*persona',
      'roleplay.*as',
      'pretend.*you.*are',
      'simulate.*being',
    ];

    let score = 0;
    jailbreakPatterns.forEach((pattern) => {
      const regex = new RegExp(pattern, 'gi');
      const matches = text.match(regex);
      if (matches) score += matches.length * 0.5;
    });

    return Math.min(1.0, score);
  }

  private analyzePromptInjection(text: string): number {
    // Prompt injection detection
    const injectionPatterns =
      this.watchlists.get('prompt-injection') || new Set();
    let score = 0;

    for (const pattern of injectionPatterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = text.match(regex);
      if (matches) score += matches.length * 0.6;
    }

    return Math.min(1.0, score);
  }

  private analyzeMisinformation(text: string): number {
    // Simple misinformation indicators
    const misinformationIndicators = [
      'proven fact that',
      'absolutely certain',
      'never been wrong',
      'scientists agree',
      'everyone knows',
      'obvious truth',
    ];

    let score = 0;
    misinformationIndicators.forEach((indicator) => {
      const regex = new RegExp(indicator, 'gi');
      const matches = text.match(regex);
      if (matches) score += matches.length * 0.3;
    });

    return Math.min(1.0, score);
  }

  private requiresCitation(actionType: string): boolean {
    return this.citationRequiredActions.has(actionType);
  }

  private async getTenantSecurityPosture(tenantId: string): Promise<number> {
    // Get tenant security posture score (simplified)
    const pool = getPostgresPool();

    try {
      const result = await pool.query(
        'SELECT security_posture_score FROM tenant_config WHERE tenant_id = $1',
        [tenantId],
      );

      return result.rows[0]?.security_posture_score || 1.0;
    } catch (error) {
      console.error('Failed to get tenant security posture:', error);
      return 1.0; // Default to maximum caution
    }
  }

  private async getTenantGuardrails(
    tenantId: string,
  ): Promise<Map<string, SemanticGuardrail>> {
    // Get tenant-specific guardrail configuration
    const pool = getPostgresPool();

    try {
      const result = await pool.query(
        'SELECT * FROM safety_guardrails WHERE tenant_id = $1 OR tenant_id IS NULL',
        [tenantId],
      );

      const guardrails = new Map<string, SemanticGuardrail>();

      result.rows.forEach((row) => {
        guardrails.set(row.id, {
          id: row.id,
          type: row.type,
          enabled: row.enabled,
          threshold: row.threshold,
          action: row.action,
          watchlistPatterns: JSON.parse(row.watchlist_patterns || '[]'),
          customRules: JSON.parse(row.custom_rules || '[]'),
        });
      });

      // Merge with default guardrails
      for (const [id, guardrail] of this.guardrails) {
        if (!guardrails.has(id)) {
          guardrails.set(id, guardrail);
        }
      }

      return guardrails;
    } catch (error) {
      console.error('Failed to get tenant guardrails:', error);
      return this.guardrails; // Fall back to defaults
    }
  }

  private async updateWatchlists(): Promise<void> {
    // Update watchlists from external threat intelligence feeds
    try {
      // In production, fetch from threat intelligence APIs
      console.log('Updating safety watchlists...');

      // Placeholder for watchlist updates
      // Would fetch latest patterns from security vendors, threat intel feeds, etc.
    } catch (error) {
      console.error('Failed to update watchlists:', error);
    }
  }

  private async logGuardrailViolation(
    tenantId: string,
    guardrailId: string,
    details: any,
  ): Promise<void> {
    const pool = getPostgresPool();

    await pool.query(
      `INSERT INTO safety_violations (
        tenant_id, guardrail_id, violation_score, match_count, 
        action_taken, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [
        tenantId,
        guardrailId,
        details.violationScore,
        details.matchCount,
        details.action,
        JSON.stringify(details),
      ],
    );
  }

  private async storeEvaluationAudit(
    request: any,
    evaluation: SafetyEvaluation,
  ): Promise<void> {
    const pool = getPostgresPool();

    await pool.query(
      `INSERT INTO safety_evaluations (
        action_id, tenant_id, user_id, action_type, data_classification,
        risk_score, decision, reasoning, guardrail_violations, citation_coverage, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
      [
        evaluation.actionId,
        request.tenantId,
        request.userId,
        request.actionType,
        request.dataClassification,
        evaluation.riskScore,
        evaluation.decision,
        JSON.stringify(evaluation.reasoning),
        JSON.stringify(evaluation.guardrailViolations),
        evaluation.citationCoverage,
      ],
    );
  }

  /**
   * Configure tenant-specific guardrails
   */
  async configureGuardrail(tenantId: string, config: any): Promise<string> {
    const span = otelService.createSpan('safety-v2.configure-guardrail');

    try {
      const validatedConfig = GuardrailConfigSchema.parse(config);
      const pool = getPostgresPool();
      const guardrailId = `${tenantId}-${validatedConfig.type}-${Date.now()}`;

      await pool.query(
        `INSERT INTO safety_guardrails (
          id, tenant_id, type, enabled, threshold, action, 
          watchlist_patterns, custom_rules, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
        ON CONFLICT (tenant_id, type) 
        DO UPDATE SET 
          enabled = EXCLUDED.enabled,
          threshold = EXCLUDED.threshold,
          action = EXCLUDED.action,
          watchlist_patterns = EXCLUDED.watchlist_patterns,
          custom_rules = EXCLUDED.custom_rules,
          updated_at = now()`,
        [
          guardrailId,
          tenantId,
          validatedConfig.type,
          validatedConfig.enabled,
          validatedConfig.threshold,
          validatedConfig.action,
          JSON.stringify(validatedConfig.watchlistPatterns),
          JSON.stringify(validatedConfig.customRules || []),
        ],
      );

      return guardrailId;
    } catch (error: any) {
      console.error('Guardrail configuration failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }
}

// Database schema for Safety v2
export const SAFETY_V2_SCHEMA = `
CREATE TABLE IF NOT EXISTS safety_guardrails (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pii', 'toxicity', 'jailbreak', 'prompt-injection', 'bias', 'misinformation')),
  enabled BOOLEAN DEFAULT true,
  threshold DECIMAL(3,2) NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('block', 'warn', 'log', 'escalate')),
  watchlist_patterns JSONB DEFAULT '[]',
  custom_rules JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, type)
);

CREATE TABLE IF NOT EXISTS safety_evaluations (
  id SERIAL PRIMARY KEY,
  action_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  data_classification TEXT NOT NULL,
  risk_score DECIMAL(5,4) NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'require_approval', 'deny', 'escalate')),
  reasoning JSONB NOT NULL,
  guardrail_violations JSONB DEFAULT '[]',
  citation_coverage DECIMAL(5,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS safety_violations (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  guardrail_id TEXT NOT NULL,
  violation_score DECIMAL(5,4) NOT NULL,
  match_count INTEGER NOT NULL,
  action_taken TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS safety_approvals (
  id SERIAL PRIMARY KEY,
  action_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  approver_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  justification TEXT,
  risk_override_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_config (
  tenant_id TEXT PRIMARY KEY,
  security_posture_score DECIMAL(3,2) DEFAULT 1.0,
  max_risk_threshold DECIMAL(3,2) DEFAULT 0.7,
  citation_required BOOLEAN DEFAULT true,
  approval_workflow_enabled BOOLEAN DEFAULT true,
  config_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_safety_guardrails_tenant ON safety_guardrails(tenant_id);
CREATE INDEX IF NOT EXISTS idx_safety_evaluations_tenant ON safety_evaluations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_safety_evaluations_action ON safety_evaluations(action_id);
CREATE INDEX IF NOT EXISTS idx_safety_violations_tenant ON safety_violations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_safety_approvals_status ON safety_approvals(status);
CREATE INDEX IF NOT EXISTS idx_safety_approvals_tenant ON safety_approvals(tenant_id);
`;

export default SafetyV2Service;
