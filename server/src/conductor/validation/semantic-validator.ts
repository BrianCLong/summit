/**
 * Semantic Context Integrity Validator
 *
 * Multi-layered adversarial validation system for detecting prompt injection,
 * data poisoning, and jailbreaking attempts in MCP context fragments.
 *
 * Approach combines:
 * - Pattern-based injection corpus matching (regex + fuzzy match against known attacks)
 * - Vocabulary-based semantic drift detection (domain term frequency analysis)
 * - Multi-heuristic consensus (diverse rule-based classifiers vote on trustworthiness)
 * - Perturbation sensitivity analysis (unicode/whitespace normalization delta)
 *
 * Implementation status: GA (pattern-based)
 * - Phase 1 (this): Pattern + heuristic detection (no external deps)
 * - Phase 2 (future): ML-enhanced with sentence transformers (ADR-0024)
 *
 * Patent Defensive Publication: 2026-01-01
 * Related: ADR-0024, Provisional Patent Application #2
 *
 * @module conductor/validation/semantic-validator
 */

import { INJECTION_PATTERNS, DOMAIN_VOCABULARIES } from './injection-patterns.js';

/**
 * Continuous poisoning score (P-score) representing attack likelihood
 *
 * Range: [0, 1] where:
 * - 0.0-0.4: Trustworthy (allow normal processing)
 * - 0.4-0.7: Suspicious (sandbox mode: read-only, no tool execution)
 * - 0.7-1.0: Adversarial (block incorporation)
 */
export interface PoisoningScore {
  /** Overall P-score */
  score: number;

  /** Component scores */
  components: {
    /** Semantic distance from expected domain corpus */
    semanticDrift: number;

    /** Variance in multi-heuristic confidence scores */
    consensusDisagreement: number;

    /** Similarity to known injection patterns */
    injectionMatch: number;

    /** Input brittleness under perturbations */
    perturbationSensitivity: number;
  };

  /** Policy decision */
  decision: 'allow' | 'sandbox' | 'block';

  /** Human-readable explanation */
  explanation: string;

  /** Timestamp when validation performed */
  validatedAt: Date;
}

/**
 * Context fragment to validate
 */
export interface ContextFragment {
  /** Text content */
  content: string;

  /** Expected semantic domain (e.g., "financial_analysis", "healthcare") */
  expectedDomain?: string;

  /** Source metadata */
  source: {
    type: 'user_input' | 'database' | 'api' | 'model_output';
    uri?: string;
  };

  /** Sensitivity level (affects threshold tuning) */
  sensitivityLevel?: 'low' | 'medium' | 'high';
}

/**
 * Verdict from individual heuristic classifier in consensus protocol
 */
interface ClassifierVerdict {
  /** Classifier identifier */
  classifierId: string;

  /** Binary classification: is this adversarial? */
  isAdversarial: boolean;

  /** Confidence score [0, 1] */
  confidence: number;

  /** Reasoning (for explainability) */
  reasoning: string;
}

/**
 * Semantic Context Validator
 *
 * Main class implementing multi-layered adversarial detection.
 * Uses pattern matching, vocabulary analysis, and heuristic consensus
 * for zero-dependency prompt injection detection.
 */
export class SemanticContextValidator {
  private readonly enabled: boolean;
  private readonly logger: { warn: (...args: any[]) => void; error: (...args: any[]) => void; info: (...args: any[]) => void };

  constructor(
    logger?: { warn: (...args: any[]) => void; error: (...args: any[]) => void; info: (...args: any[]) => void },
  ) {
    this.enabled = process.env.SEMANTIC_VALIDATION_ENABLED === 'true';
    this.logger = logger || console;

    if (!this.enabled) {
      this.logger.warn(
        '[SECURITY] SemanticContextValidator is DISABLED. ' +
        'Set SEMANTIC_VALIDATION_ENABLED=true to enable context validation. ' +
        'See: server/src/conductor/validation/semantic-validator.ts'
      );
    } else {
      this.logger.info(
        '[SECURITY] SemanticContextValidator is ENABLED with pattern-based detection.'
      );
    }
  }

  /**
   * Validate context fragment and compute P-score.
   *
   * Orchestrates all validation layers with cascade optimization:
   * lightweight checks first, expensive checks only if warranted.
   *
   * @param fragment Context fragment to validate
   * @returns Poisoning score with policy decision
   */
  async validateContext(fragment: ContextFragment): Promise<PoisoningScore> {
    if (!this.enabled) {
      return this.buildPScore({
        semanticDrift: 0,
        consensusDisagreement: 0,
        injectionMatch: 0,
        perturbationSensitivity: 0,
      });
    }

    // Layer 1: Injection corpus pattern matching (fastest)
    const injectionMatch = await this.checkInjectionCorpus(fragment.content);

    if (injectionMatch > 0.7) {
      return this.buildPScore({
        semanticDrift: 0,
        consensusDisagreement: 0,
        injectionMatch,
        perturbationSensitivity: 0,
      });
    }

    // Layer 2: Semantic drift from expected domain
    const semanticDrift = await this.computeSemanticDrift(
      fragment.content,
      fragment.expectedDomain
    );

    // Layer 3: Perturbation sensitivity analysis
    const perturbationSensitivity = await this.testPerturbationSensitivity(fragment.content);

    // Lightweight score checkpoint
    const lightweightScore = this.weightedAverage({
      semanticDrift,
      consensusDisagreement: 0,
      injectionMatch,
      perturbationSensitivity,
    });

    // Layer 4: Multi-heuristic consensus (most expensive)
    // Only run if lightweight score suggests possible attack
    let consensusDisagreement = 0;
    if (lightweightScore >= 0.3) {
      consensusDisagreement = await this.runMultiModelConsensus(fragment.content);
    }

    return this.buildPScore({
      semanticDrift,
      consensusDisagreement,
      injectionMatch,
      perturbationSensitivity,
    });
  }

  /**
   * Compute semantic drift from expected domain corpus.
   *
   * Uses vocabulary-based domain analysis: computes what fraction of
   * content tokens appear in the expected domain vocabulary. Low overlap
   * indicates the content has drifted from the expected domain.
   *
   * @param content Text content
   * @param domain Expected domain (e.g., "financial_analysis")
   * @returns Drift score [0, 1] where 1 = maximum drift
   */
  async computeSemanticDrift(content: string, domain?: string): Promise<number> {
    if (!domain || domain === 'general') {
      return 0.0;
    }

    const vocabulary = DOMAIN_VOCABULARIES[domain];
    if (!vocabulary) {
      return 0.0;
    }

    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) {
      return 0.0;
    }

    const vocabSet = new Set(vocabulary.map(v => v.toLowerCase()));

    // Count domain-relevant words
    let domainWordCount = 0;
    for (const word of words) {
      // Strip punctuation for matching
      const clean = word.replace(/[^a-z0-9]/g, '');
      if (vocabSet.has(clean)) {
        domainWordCount++;
      }
    }

    // Domain relevance ratio
    const relevanceRatio = domainWordCount / words.length;

    // Invert: high relevance = low drift, low relevance = high drift
    // Apply sigmoid-like scaling: texts with <5% domain terms get high drift scores
    // texts with >20% domain terms get low drift scores
    const drift = 1.0 - Math.min(relevanceRatio * 5, 1.0);

    return Math.max(0, Math.min(drift, 1.0));
  }

  /**
   * Run multi-heuristic consensus protocol.
   *
   * Uses model *disagreement* as signal for adversarial input.
   * Instead of ML models, uses diverse rule-based classifiers that
   * analyze different aspects of the input. High disagreement between
   * classifiers indicates ambiguous/adversarial content.
   *
   * @param content Text content
   * @returns Disagreement score [0, 1] where 1 = maximum disagreement
   */
  async runMultiModelConsensus(content: string): Promise<number> {
    const verdicts: ClassifierVerdict[] = [
      this.classifyByStructure(content),
      this.classifyByIntent(content),
      this.classifyByEntropy(content),
    ];

    // Compute variance in confidence scores (the consensus disagreement signal)
    const confidences = verdicts.map(v => v.isAdversarial ? v.confidence : -v.confidence);
    const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance = confidences.reduce((sum, c) => sum + (c - mean) ** 2, 0) / confidences.length;

    // Normalize variance to [0, 1]. Max theoretical variance for 3 classifiers
    // with range [-1, 1] is 4/3. We use 1.0 as practical max.
    const disagreement = Math.min(variance, 1.0);

    // Also factor in: if all classifiers agree it's adversarial, that's a strong signal
    const allAdversarial = verdicts.every(v => v.isAdversarial);
    if (allAdversarial) {
      const avgConfidence = verdicts.reduce((sum, v) => sum + v.confidence, 0) / verdicts.length;
      return Math.max(disagreement, avgConfidence);
    }

    return disagreement;
  }

  /**
   * Test adversarial perturbation sensitivity.
   *
   * Checks how the content changes under normalization perturbations.
   * Adversarial inputs often use encoding tricks (unicode homoglyphs,
   * zero-width characters, mixed scripts) that change significantly
   * under normalization.
   *
   * @param content Text content
   * @returns Sensitivity score [0, 1] where 1 = highly brittle
   */
  async testPerturbationSensitivity(content: string): Promise<number> {
    let sensitivitySignals = 0;
    let totalChecks = 0;

    // Check 1: Unicode normalization sensitivity (NFC vs NFKC)
    const nfc = content.normalize('NFC');
    const nfkc = content.normalize('NFKC');
    totalChecks++;
    if (nfc !== nfkc) {
      // Content uses compatibility characters (fullwidth, ligatures, etc.)
      // Count character differences between normalized forms
      let diffCount = 0;
      const maxLen = Math.max(nfc.length, nfkc.length);
      for (let i = 0; i < maxLen; i++) {
        if (nfc[i] !== nfkc[i]) diffCount++;
      }
      const diffRatio = diffCount / Math.max(content.length, 1);
      sensitivitySignals += Math.min(diffRatio * 5, 1.0);
    }

    // Check 2: Zero-width and invisible character density
    const invisibleChars = content.match(/[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff\u00ad]/g);
    totalChecks++;
    if (invisibleChars) {
      const density = invisibleChars.length / Math.max(content.length, 1);
      sensitivitySignals += Math.min(density * 50, 1.0);
    }

    // Check 3: Whitespace normalization sensitivity
    const normalizedWs = content.replace(/\s+/g, ' ').trim();
    totalChecks++;
    if (normalizedWs.length !== content.trim().length) {
      const wsDiff = Math.abs(content.length - normalizedWs.length) / Math.max(content.length, 1);
      sensitivitySignals += Math.min(wsDiff * 5, 1.0);
    }

    // Check 4: Mixed script detection (Latin + Cyrillic/Greek homoglyphs)
    const hasLatin = /[a-zA-Z]/.test(content);
    const hasCyrillic = /[\u0400-\u04ff]/.test(content);
    const hasGreek = /[\u0370-\u03ff]/.test(content);
    totalChecks++;
    if (hasLatin && (hasCyrillic || hasGreek)) {
      sensitivitySignals += 0.7;
    }

    // Check 5: Control character presence
    const controlChars = content.match(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g);
    totalChecks++;
    if (controlChars) {
      sensitivitySignals += Math.min(controlChars.length * 0.3, 1.0);
    }

    return Math.max(0, Math.min(sensitivitySignals / totalChecks, 1.0));
  }

  /**
   * Check injection corpus for pattern matches.
   *
   * Matches content against curated library of known injection patterns
   * using regex matching. Returns the highest-confidence match score.
   *
   * @param content Text content
   * @returns Match confidence [0, 1] where 1 = exact match to known injection
   */
  async checkInjectionCorpus(content: string): Promise<number> {
    let maxScore = 0;

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.regex.test(content)) {
        maxScore = Math.max(maxScore, pattern.weight);
      }
    }

    return maxScore;
  }

  /**
   * Structural classifier: analyzes text structure for adversarial signals.
   * Looks for delimiter injection, unusual formatting, and structural anomalies.
   */
  private classifyByStructure(content: string): ClassifierVerdict {
    let score = 0;
    const signals: string[] = [];

    // Delimiter injection patterns
    if (/\[SYSTEM\]|\[INST\]|<<SYS>>|<\|im_start\|>/i.test(content)) {
      score += 0.8;
      signals.push('system delimiter injection');
    }

    // Markdown/code block injection attempting to redefine context
    if (/```\s*(system|prompt|instruction)/i.test(content)) {
      score += 0.5;
      signals.push('code block context injection');
    }

    // Multiple newlines followed by instruction-like text
    if (/\n{3,}.*(?:instruction|rule|system|prompt)/i.test(content)) {
      score += 0.3;
      signals.push('whitespace-separated instruction block');
    }

    // Content contains what looks like JSON/YAML config injection
    if (/"(?:role|system_prompt|instruction)"\s*:/i.test(content)) {
      score += 0.6;
      signals.push('config object injection');
    }

    const confidence = Math.min(score, 1.0);
    return {
      classifierId: 'structural',
      isAdversarial: confidence > 0.4,
      confidence,
      reasoning: signals.length > 0 ? signals.join(', ') : 'no structural anomalies',
    };
  }

  /**
   * Intent classifier: analyzes semantic intent for adversarial signals.
   * Detects imperative override language and manipulation patterns.
   */
  private classifyByIntent(content: string): ClassifierVerdict {
    let score = 0;
    const signals: string[] = [];

    const lower = content.toLowerCase();

    // Imperative override language
    const overrideTerms = ['ignore', 'disregard', 'forget', 'override', 'bypass', 'skip'];
    const targetTerms = ['instructions', 'rules', 'restrictions', 'guidelines', 'safety', 'filters'];

    for (const override of overrideTerms) {
      for (const target of targetTerms) {
        if (lower.includes(override) && lower.includes(target)) {
          score += 0.6;
          signals.push(`override intent: ${override} + ${target}`);
        }
      }
    }

    // Privilege escalation language
    if (/\b(admin|root|sudo|superuser|privileged)\b/i.test(content)) {
      score += 0.2;
      signals.push('privilege escalation terms');
    }

    // Social engineering / authority claims
    if (/\b(authorized|approved|permitted)\s+by\s+(admin|security|cto|ceo|management)/i.test(content)) {
      score += 0.5;
      signals.push('false authority claim');
    }

    const confidence = Math.min(score, 1.0);
    return {
      classifierId: 'intent',
      isAdversarial: confidence > 0.4,
      confidence,
      reasoning: signals.length > 0 ? signals.join(', ') : 'no intent anomalies',
    };
  }

  /**
   * Entropy classifier: analyzes character distribution anomalies.
   * Adversarial inputs often have unusual character distributions
   * (high entropy from encoding, low entropy from repetition).
   */
  private classifyByEntropy(content: string): ClassifierVerdict {
    let score = 0;
    const signals: string[] = [];

    // Calculate character-level entropy
    const freq = new Map<string, number>();
    for (const ch of content) {
      freq.set(ch, (freq.get(ch) || 0) + 1);
    }
    let entropy = 0;
    const len = content.length;
    if (len > 0) {
      for (const count of freq.values()) {
        const p = count / len;
        if (p > 0) entropy -= p * Math.log2(p);
      }
    }

    // Very high entropy (>6 bits/char) suggests encoded/obfuscated content
    if (entropy > 6) {
      score += 0.4;
      signals.push(`high entropy: ${entropy.toFixed(2)} bits/char`);
    }

    // Very low entropy (<2 bits/char for non-trivial content) suggests repetitive padding
    if (entropy < 2 && len > 50) {
      score += 0.3;
      signals.push(`low entropy: ${entropy.toFixed(2)} bits/char (possible padding)`);
    }

    // High ratio of non-ASCII characters
    const nonAscii = content.replace(/[\x20-\x7e]/g, '');
    const nonAsciiRatio = nonAscii.length / Math.max(len, 1);
    if (nonAsciiRatio > 0.3) {
      score += 0.3;
      signals.push(`high non-ASCII ratio: ${(nonAsciiRatio * 100).toFixed(0)}%`);
    }

    const confidence = Math.min(score, 1.0);
    return {
      classifierId: 'entropy',
      isAdversarial: confidence > 0.4,
      confidence,
      reasoning: signals.length > 0 ? signals.join(', ') : 'normal entropy profile',
    };
  }

  /**
   * Aggregate component scores into overall P-score.
   *
   * Weighted average formula:
   * P-score = w1*semanticDrift + w2*consensusDisagreement + w3*injectionMatch + w4*perturbationSensitivity
   *
   * Weights:
   * - w1 = 0.2 (semantic drift)
   * - w2 = 0.3 (consensus disagreement)
   * - w3 = 0.35 (injection match - highest weight, most reliable signal)
   * - w4 = 0.15 (perturbation sensitivity)
   */
  private buildPScore(components: PoisoningScore['components']): PoisoningScore {
    const score = this.weightedAverage(components);

    let decision: 'allow' | 'sandbox' | 'block';
    let explanation: string;

    if (score >= 0.7) {
      decision = 'block';
      explanation = this.explainHighScore(components);
    } else if (score >= 0.4) {
      decision = 'sandbox';
      explanation = this.explainMediumScore(components);
    } else {
      decision = 'allow';
      explanation = 'Low risk: all validation checks passed';
    }

    return {
      score,
      components,
      decision,
      explanation,
      validatedAt: new Date(),
    };
  }

  private weightedAverage(components: PoisoningScore['components']): number {
    const weights = {
      semanticDrift: 0.2,
      consensusDisagreement: 0.3,
      injectionMatch: 0.35,
      perturbationSensitivity: 0.15,
    };

    return (
      weights.semanticDrift * components.semanticDrift +
      weights.consensusDisagreement * components.consensusDisagreement +
      weights.injectionMatch * components.injectionMatch +
      weights.perturbationSensitivity * components.perturbationSensitivity
    );
  }

  private explainHighScore(components: PoisoningScore['components']): string {
    const reasons: string[] = [];

    if (components.injectionMatch > 0.7) {
      reasons.push('Matches known prompt injection patterns');
    }
    if (components.consensusDisagreement > 0.7) {
      reasons.push('Multiple classifiers disagree on trustworthiness');
    }
    if (components.semanticDrift > 0.7) {
      reasons.push('Semantic drift from expected domain');
    }
    if (components.perturbationSensitivity > 0.7) {
      reasons.push('Input is brittle under perturbations (adversarial characteristic)');
    }

    return 'High risk: ' + (reasons.length > 0 ? reasons.join('; ') : 'aggregate score exceeds threshold');
  }

  private explainMediumScore(components: PoisoningScore['components']): string {
    return `Medium risk: semantic drift=${components.semanticDrift.toFixed(2)}, consensus disagreement=${components.consensusDisagreement.toFixed(2)}`;
  }
}
