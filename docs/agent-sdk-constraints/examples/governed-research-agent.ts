/**
 * Example: Summit-Governed Research Agent
 *
 * This agent performs research tasks while maintaining:
 * - Integrity-aware source selection
 * - Epistemic sovereignty constraints
 * - Narrative diversity
 * - Strategic silence capability
 */

import { SummitGovernedAgent } from "../governed-agent-base";
import { SummitIntegrationRuntime } from "@summit/runtime";

// ============================================================================
// TYPES
// ============================================================================

interface ResearchTask {
  question: string;
  domain: string;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  deadline?: Date;
  min_sources?: number;
}

interface ResearchResult {
  answer: string;
  confidence: number;
  integrity: number;
  sources: SourceCitation[];
  caveats: string[];
  alternative_answers: AlternativeAnswer[];
  unexplained_elements: string[];
  summit_validated: boolean;
  narrative_health: NarrativeHealth;
}

interface SourceCitation {
  source_id: string;
  content_excerpt: string;
  integrity_score: number;
  confidence: number;
  url?: string;
}

interface AlternativeAnswer {
  answer: string;
  support: number; // 0.0 to 1.0
  why_not_primary: string;
}

interface NarrativeHealth {
  diversity_index: number;
  premature_convergence: boolean;
  unexplained_ratio: number;
  warnings: string[];
}

// ============================================================================
// GOVERNED RESEARCH AGENT
// ============================================================================

export class GovernedResearchAgent extends SummitGovernedAgent {
  constructor() {
    super({
      agent_id: "research-agent-001",
      domain: "general_research",
      capabilities: ["web_search", "document_analysis", "citation_management", "synthesis"],
      summit_config: {
        mode: "FULL_ENFORCEMENT",
        integrity_threshold: 0.65,
        sovereignty_quota: 0.75, // Allow 75% AI-assisted maximum
      },
    });
  }

  /**
   * Main entry point: Research a question with Summit governance
   */
  async research(task: ResearchTask): Promise<ResearchResult> {
    console.log(`\n🔬 Researching: "${task.question}"`);
    console.log(`📊 Criticality: ${task.criticality}`);
    console.log(`🛡️  Summit enforcement: ACTIVE\n`);

    // Step 1: Check if strategic silence is appropriate
    const should_proceed = await this.evaluateActionNecessity({
      task: task.question,
      urgency: task.deadline ? this.calculateUrgency(task.deadline) : 0.5,
      criticality: task.criticality,
    });

    if (should_proceed.action === "STRATEGIC_SILENCE") {
      throw new StrategicSilenceException(
        `Agent chose strategic silence: ${should_proceed.message}`,
        should_proceed.silence_decision
      );
    }

    // Step 2: Gather information from multiple sources
    console.log("📚 Gathering information from diverse sources...");
    const sources = await this.gatherResearchSources(task);
    console.log(`✓ Gathered ${sources.length} sources\n`);

    // Step 3: Process each source through Summit validation
    console.log("🔍 Validating source integrity...");
    const validated_sources = await this.validateSources(sources, task);
    console.log(`✓ ${validated_sources.length}/${sources.length} sources passed validation\n`);

    if (validated_sources.length < (task.min_sources || 2)) {
      throw new InsufficientValidSourcesError(
        `Insufficient validated sources. Required: ${task.min_sources || 2}, Valid: ${validated_sources.length}`
      );
    }

    // Step 4: Synthesize answer from validated sources
    console.log("🧠 Synthesizing answer...");
    const preliminary_answer = await this.synthesizeAnswer(task.question, validated_sources);

    // Step 5: Generate alternative answers (prevent premature convergence)
    console.log("🔀 Generating alternative answers...");
    const alternatives = await this.generateAlternativeAnswers(task.question, validated_sources);
    console.log(`✓ Generated ${alternatives.length} alternative answers\n`);

    // Step 6: Narrative health check
    console.log("📖 Checking narrative health...");
    const narrative_health = await this.checkNarrativeHealth(
      preliminary_answer,
      alternatives,
      validated_sources
    );

    if (narrative_health.premature_convergence) {
      console.log("⚠️  Warning: Premature narrative convergence detected");
    }

    // Step 7: Identify unexplained elements
    const unexplained = this.identifyUnexplainedElements(preliminary_answer, validated_sources);

    if (unexplained.length > 0) {
      console.log(`⚠️  Warning: ${unexplained.length} unexplained elements remain\n`);
    }

    // Step 8: Calculate confidence and integrity
    const confidence = this.calculateConfidence(validated_sources);
    const integrity = this.calculateAverageIntegrity(validated_sources);

    console.log(`📊 Confidence: ${(confidence * 100).toFixed(1)}%`);
    console.log(`🛡️  Integrity: ${(integrity * 100).toFixed(1)}%`);

    // Step 9: Final policy check
    const policy_compliant = await this.summit.policy.checkCompliance({
      agent_id: this.agent_id,
      task: task,
      confidence: confidence,
      integrity: integrity,
      source_count: validated_sources.length,
    });

    if (!policy_compliant) {
      throw new PolicyViolationError("Research result does not meet policy requirements");
    }

    // Step 10: Assemble result
    return {
      answer: preliminary_answer,
      confidence: confidence,
      integrity: integrity,
      sources: validated_sources.map((s) => this.formatSourceCitation(s)),
      caveats: this.generateCaveats(validated_sources, narrative_health),
      alternative_answers: alternatives,
      unexplained_elements: unexplained,
      summit_validated: true,
      narrative_health: narrative_health,
    };
  }

  /**
   * Gather research sources using multiple search strategies
   */
  private async gatherResearchSources(task: ResearchTask): Promise<any[]> {
    const sources = [];

    // Strategy 1: Web search
    try {
      const web_results = await this.executeToolCall("web_search", {
        query: task.question,
        num_results: 5,
      });
      sources.push(
        ...web_results.results.map((r) => ({
          type: "web",
          ...r,
        }))
      );
    } catch (error) {
      console.log("⚠️  Web search failed:", error.message);
    }

    // Strategy 2: Academic database
    try {
      const academic_results = await this.executeToolCall("academic_search", {
        query: task.question,
        num_results: 3,
      });
      sources.push(
        ...academic_results.results.map((r) => ({
          type: "academic",
          ...r,
        }))
      );
    } catch (error) {
      console.log("⚠️  Academic search failed:", error.message);
    }

    // Strategy 3: Internal knowledge base
    try {
      const kb_results = await this.executeToolCall("knowledge_base_search", {
        query: task.question,
        num_results: 3,
      });
      sources.push(
        ...kb_results.results.map((r) => ({
          type: "knowledge_base",
          ...r,
        }))
      );
    } catch (error) {
      console.log("⚠️  Knowledge base search failed:", error.message);
    }

    return sources;
  }

  /**
   * Validate sources through Summit pipeline
   */
  private async validateSources(sources: any[], task: ResearchTask): Promise<any[]> {
    const validated = [];

    for (const source of sources) {
      try {
        const result = await this.summit.processInformation(
          {
            id: source.id || `source_${Date.now()}_${Math.random()}`,
            content: source.content,
            source: {
              source_id: source.source_id || source.url || "unknown",
              source_type: this.mapSourceType(source.type),
              source_age_days: 0,
            },
            timestamp: new Date(),
            context: { task: task.question },
          },
          {
            domain: task.domain,
            criticality: task.criticality,
            ai_assisted: true,
            agent_id: this.agent_id,
          }
        );

        if (result.status === "APPROVED" || result.status === "SOVEREIGNTY_WARNING") {
          validated.push({
            ...source,
            summit_metadata: result.metadata,
          });
        } else {
          console.log(`  ✗ Source rejected: ${result.reason}`);
        }
      } catch (error) {
        console.log(`  ✗ Source validation error: ${error.message}`);
      }
    }

    return validated;
  }

  /**
   * Synthesize answer from validated sources
   */
  private async synthesizeAnswer(question: string, sources: any[]): Promise<string> {
    const source_contents = sources.map((s, i) => `[Source ${i + 1}]: ${s.content}`).join("\n\n");

    const response = await this.llm.generate({
      prompt:
        `Based on the following sources, answer this question: "${question}"\n\n` +
        `Sources:\n${source_contents}\n\n` +
        `Provide a clear, concise answer. Acknowledge uncertainty where appropriate.`,
      max_tokens: 300,
    });

    return response.text;
  }

  /**
   * Generate alternative answers (mandatory for narrative diversity)
   */
  private async generateAlternativeAnswers(
    question: string,
    sources: any[]
  ): Promise<AlternativeAnswer[]> {
    const source_contents = sources.map((s, i) => `[Source ${i + 1}]: ${s.content}`).join("\n\n");

    const response = await this.llm.generate({
      prompt:
        `Question: "${question}"\n\n` +
        `Sources:\n${source_contents}\n\n` +
        `Generate 2-3 alternative answers to this question that are also consistent with the sources.\n` +
        `For each alternative, explain why it might be less compelling than the primary answer.\n` +
        `Format: JSON array of {answer, why_not_primary}`,
      max_tokens: 400,
      temperature: 0.9, // Higher temperature for diversity
    });

    const alternatives = JSON.parse(response.text);

    // Calculate support for each alternative based on source agreement
    return alternatives.map((alt) => ({
      ...alt,
      support: this.calculateSupport(alt.answer, sources),
    }));
  }

  /**
   * Check narrative health
   */
  private async checkNarrativeHealth(
    primary_answer: string,
    alternatives: AlternativeAnswer[],
    sources: any[]
  ): Promise<NarrativeHealth> {
    const diversity_index = this.calculateNarrativeDiversity([
      { answer: primary_answer, support: 1.0 },
      ...alternatives,
    ]);

    const unexplained_ratio = this.calculateUnexplainedRatio(primary_answer, sources);

    const warnings = [];

    // Check for premature convergence
    const premature_convergence = diversity_index < 1.0;
    if (premature_convergence) {
      warnings.push(
        `Low narrative diversity (${diversity_index.toFixed(2)} < 1.0). ` +
          `Consider exploring additional framings.`
      );
    }

    // Check for high unexplained ratio
    if (unexplained_ratio > 0.3) {
      warnings.push(
        `High unexplained elements ratio (${(unexplained_ratio * 100).toFixed(0)}%). ` +
          `Answer may be incomplete.`
      );
    }

    return {
      diversity_index,
      premature_convergence,
      unexplained_ratio,
      warnings,
    };
  }

  /**
   * Calculate narrative diversity index (entropy-based)
   */
  private calculateNarrativeDiversity(answers: Array<{ support: number }>): number {
    // Normalize support values to probabilities
    const total_support = answers.reduce((sum, a) => sum + a.support, 0);
    const probabilities = answers.map((a) => a.support / total_support);

    // Calculate Shannon entropy
    const entropy = -probabilities
      .filter((p) => p > 0)
      .reduce((sum, p) => sum + p * Math.log2(p), 0);

    return entropy;
  }

  /**
   * Calculate what portion of source information is unexplained by answer
   */
  private calculateUnexplainedRatio(answer: string, sources: any[]): number {
    // Simplified: Real implementation would use semantic similarity
    // to determine what facts from sources are addressed in answer
    const answer_words = new Set(answer.toLowerCase().split(/\s+/));
    const source_words = new Set(sources.flatMap((s) => s.content.toLowerCase().split(/\s+/)));

    const explained_words = [...source_words].filter((w) => answer_words.has(w));
    const unexplained_ratio = 1 - explained_words.length / source_words.size;

    // Cap at reasonable range
    return Math.min(Math.max(unexplained_ratio, 0), 1);
  }

  /**
   * Identify specific unexplained elements
   */
  private identifyUnexplainedElements(answer: string, sources: any[]): string[] {
    // Simplified: Extract key facts from sources not addressed in answer
    const unexplained: string[] = [];

    // Real implementation would use NLP to extract claims from sources
    // and check if each claim is addressed in the answer

    // Placeholder implementation
    const source_sentences = sources.flatMap((s) => s.content.split(/[.!?]+/));

    for (const sentence of source_sentences.slice(0, 10)) {
      const key_terms = this.extractKeyTerms(sentence);
      const addressed = key_terms.some((term) => answer.toLowerCase().includes(term.toLowerCase()));

      if (!addressed && sentence.trim().length > 20) {
        unexplained.push(sentence.trim());
      }

      if (unexplained.length >= 5) break; // Limit to 5
    }

    return unexplained;
  }

  /**
   * Generate caveats for the research result
   */
  private generateCaveats(sources: any[], narrative_health: NarrativeHealth): string[] {
    const caveats: string[] = [];

    // Low integrity sources
    const low_integrity = sources.filter((s) => s.summit_metadata.truth_ops.integrity_score < 0.7);

    if (low_integrity.length > 0) {
      caveats.push(
        `${low_integrity.length}/${sources.length} sources have medium/low integrity. ` +
          `Findings should be validated through additional research.`
      );
    }

    // Narrative health warnings
    caveats.push(...narrative_health.warnings);

    // Source type diversity
    const source_types = new Set(sources.map((s) => s.type));
    if (source_types.size < 2) {
      caveats.push(
        `All sources are of type "${[...source_types][0]}". ` +
          `Consider consulting additional source types.`
      );
    }

    return caveats;
  }

  // Helper methods
  private mapSourceType(type: string): any {
    const mapping = {
      web: "external_api",
      academic: "external_api",
      knowledge_base: "automated_system",
    };
    return mapping[type] || "external_api";
  }

  private calculateConfidence(sources: any[]): number {
    const confidences = sources.map((s) => s.summit_metadata.truth_ops.confidence);
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  private calculateAverageIntegrity(sources: any[]): number {
    const scores = sources.map((s) => s.summit_metadata.truth_ops.integrity_score);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private calculateSupport(answer: string, sources: any[]): number {
    // Simplified: Calculate how much sources support this answer
    // Real implementation would use semantic similarity
    return 0.5 + Math.random() * 0.3; // Placeholder
  }

  private extractKeyTerms(text: string): string[] {
    // Simplified: Extract important words
    const words = text.split(/\s+/);
    return words.filter((w) => w.length > 5).slice(0, 3);
  }

  private formatSourceCitation(source: any): SourceCitation {
    return {
      source_id: source.source_id || source.url,
      content_excerpt: source.content.substring(0, 200) + "...",
      integrity_score: source.summit_metadata.truth_ops.integrity_score,
      confidence: source.summit_metadata.truth_ops.confidence,
      url: source.url,
    };
  }
}

// ============================================================================
// EXCEPTIONS
// ============================================================================

class StrategicSilenceException extends Error {
  constructor(
    message: string,
    public silence_decision: any
  ) {
    super(message);
    this.name = "StrategicSilenceException";
  }
}

class InsufficientValidSourcesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientValidSourcesError";
  }
}

class PolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyViolationError";
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

async function main() {
  const agent = new GovernedResearchAgent();

  try {
    const result = await agent.research({
      question: "What are the primary causes of the 2008 financial crisis?",
      domain: "economics",
      criticality: "HIGH",
      min_sources: 3,
    });

    console.log("\n" + "=".repeat(80));
    console.log("📋 RESEARCH RESULT");
    console.log("=".repeat(80));
    console.log("\n🎯 Answer:");
    console.log(result.answer);

    console.log(`\n📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`🛡️  Integrity: ${(result.integrity * 100).toFixed(1)}%`);
    console.log(`✅ Summit Validated: ${result.summit_validated}`);

    console.log(`\n📚 Sources (${result.sources.length}):`);
    result.sources.forEach((s, i) => {
      console.log(
        `  ${i + 1}. ${s.source_id} (integrity: ${(s.integrity_score * 100).toFixed(0)}%)`
      );
    });

    if (result.caveats.length > 0) {
      console.log(`\n⚠️  Caveats:`);
      result.caveats.forEach((c) => console.log(`  - ${c}`));
    }

    if (result.alternative_answers.length > 0) {
      console.log(`\n🔀 Alternative Answers (${result.alternative_answers.length}):`);
      result.alternative_answers.forEach((alt, i) => {
        console.log(`  ${i + 1}. ${alt.answer}`);
        console.log(`     Why not primary: ${alt.why_not_primary}`);
      });
    }

    if (result.unexplained_elements.length > 0) {
      console.log(`\n❓ Unexplained Elements (${result.unexplained_elements.length}):`);
      result.unexplained_elements.slice(0, 3).forEach((elem, i) => {
        console.log(`  ${i + 1}. ${elem}`);
      });
    }

    console.log(`\n📖 Narrative Health:`);
    console.log(`  Diversity Index: ${result.narrative_health.diversity_index.toFixed(2)}`);
    console.log(
      `  Premature Convergence: ${result.narrative_health.premature_convergence ? "Yes ⚠️" : "No ✓"}`
    );
    console.log(
      `  Unexplained Ratio: ${(result.narrative_health.unexplained_ratio * 100).toFixed(1)}%`
    );

    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    if (error instanceof StrategicSilenceException) {
      console.log("\n🤫 Agent chose STRATEGIC SILENCE");
      console.log(`Reason: ${error.message}`);
      console.log(`Review in: ${error.silence_decision.review_in_minutes} minutes`);
    } else {
      console.error("\n❌ Research failed:", error.message);
      throw error;
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { GovernedResearchAgent };
