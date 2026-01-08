# Summit Agent SDK Constraints

## Agent-Level Truth Operations Enforcement

> **"If agents are autonomous decision-makers, they must be constrained by the same epistemic defenses that govern humans."**

## Executive Summary

This document defines how Summit's truth operations, integrity scoring, and epistemic sovereignty capabilities are **enforced at the agent level** within the Claude Agent SDK.

Agents inherit all organizational constraints automatically, making truth-defensive behavior the **default**, not an option.

---

## Architecture: Agents as Governed Entities

### Traditional Agent Architecture

```
Agent receives task
    ↓
Agent plans approach
    ↓
Agent executes tools
    ↓
Agent returns result
```

**Problem**: No epistemic governance, adversarial resistance, or sovereignty constraints

### Summit-Governed Agent Architecture

```
Agent receives task
    ↓
[SOVEREIGNTY CHECK] Is this task within agent's independence quota?
    ↓
Agent plans approach
    ↓
[INTEGRITY CHECK] Are information sources trustworthy?
    ↓
Agent executes tools (each tool call passes through runtime)
    ↓
[TRUTH OPS VALIDATION] Are outputs integrity-verified?
    ↓
[DECISION ENFORCEMENT] Does decision comply with policies?
    ↓
Agent returns governed result
```

**Enforcement**: Every agent action subject to Summit runtime validation

---

## Integration Points

### 1. Agent Initialization (Sovereignty Registration)

**Purpose**: Register agent with sovereignty layer, establish quotas

```typescript
import { SummitIntegrationRuntime } from "@summit/runtime";
import { Agent } from "@claude/agent-sdk";

class SummitGovernedAgent extends Agent {
  private summit: SummitIntegrationRuntime;
  private agent_id: string;
  private domain: string;

  constructor(config: AgentConfig) {
    super(config);

    this.agent_id = config.agent_id;
    this.domain = config.domain;

    // Initialize Summit runtime
    this.summit = new SummitIntegrationRuntime({
      mode: "FULL_ENFORCEMENT",
    });

    // Register with sovereignty layer
    this.summit.sovereignty.registerAgent({
      agent_id: this.agent_id,
      domain: this.domain,
      ai_type: "autonomous_agent",
      capabilities: config.capabilities,
    });

    console.log(`Agent ${this.agent_id} registered with Summit governance`);
  }
}
```

### 2. Tool Call Interception (Integrity Enforcement)

**Purpose**: Every tool call validated for integrity before execution

```typescript
class SummitGovernedAgent extends Agent {
  /**
   * Override executeToolCall to add Summit governance
   */
  protected async executeToolCall(
    toolName: string,
    args: Record<string, any>
  ): Promise<ToolResult> {
    // Before execution: Check sovereignty constraints
    const sovereignty_check = await this.summit.sovereignty.checkToolCallPermitted({
      agent_id: this.agent_id,
      tool_name: toolName,
      domain: this.domain,
    });

    if (!sovereignty_check.permitted) {
      throw new SovereigntyViolationError(
        `Tool call blocked: ${sovereignty_check.reason}\n` +
          `AI involvement quota exceeded. Agent must operate with reduced autonomy.`
      );
    }

    // Execute tool call through parent
    const raw_result = await super.executeToolCall(toolName, args);

    // After execution: Validate output integrity
    const validation = await this.summit.validateToolOutput({
      tool_name: toolName,
      args: args,
      output: raw_result,
      agent_id: this.agent_id,
    });

    if (!validation.passed) {
      // Output failed integrity check
      if (validation.containment_required) {
        // Quarantine the output
        await this.summit.truth_ops.quarantineInformation({
          source: `agent:${this.agent_id}:tool:${toolName}`,
          content: raw_result,
          reason: validation.reason,
        });

        throw new IntegrityViolationError(
          `Tool output quarantined: ${validation.reason}\n` +
            `Integrity score: ${validation.metadata.integrity_score}`
        );
      }

      // Return with warning
      return {
        ...raw_result,
        summit_warning: validation.reason,
        integrity_metadata: validation.metadata,
      };
    }

    // Attach Summit metadata to result
    return {
      ...raw_result,
      summit_metadata: validation.metadata,
    };
  }
}
```

### 3. Decision Making (Policy Enforcement)

**Purpose**: Agent decisions must pass policy checks

```typescript
class SummitGovernedAgent extends Agent {
  /**
   * Make decision with Summit governance
   */
  async makeDecision(context: DecisionContext): Promise<Decision> {
    // Gather information sources
    const info_sources = await this.gatherInformation(context);

    // Process all information through Summit runtime
    const processed_sources = await Promise.all(
      info_sources.map(async (source) => {
        const result = await this.summit.processInformation(source, {
          domain: this.domain,
          criticality: context.criticality,
          ai_assisted: true, // Agent is AI
          agent_id: this.agent_id,
        });

        if (result.status === "DENIED" || result.status === "QUARANTINED") {
          // Cannot use this source
          return null;
        }

        return {
          source,
          metadata: result.metadata,
        };
      })
    );

    // Filter out rejected sources
    const valid_sources = processed_sources.filter((s) => s !== null);

    if (valid_sources.length === 0) {
      throw new NoValidSourcesError(
        "All information sources failed Summit validation. Cannot make decision."
      );
    }

    // Check diversity requirements
    if (valid_sources.length < 2) {
      throw new DiversityRequirementError(
        `Insufficient source diversity. Required: 2+, Available: ${valid_sources.length}`
      );
    }

    // Formulate decision
    const preliminary_decision = await this.formulateDecision(context, valid_sources);

    // Validate decision through policy engine
    const policy_check = await this.summit.policy.evaluateDecision({
      decision: preliminary_decision,
      sources: valid_sources,
      agent_id: this.agent_id,
      context: context,
    });

    if (!policy_check.compliant) {
      throw new PolicyViolationError(
        `Decision violates policy: ${policy_check.violations.map((v) => v.message).join("; ")}`
      );
    }

    // Decision approved
    return {
      ...preliminary_decision,
      summit_validated: true,
      summit_metadata: {
        sources: valid_sources.length,
        integrity_average: this.calculateAverageIntegrity(valid_sources),
        policy_compliant: true,
      },
    };
  }

  private calculateAverageIntegrity(sources: any[]): number {
    const scores = sources.map((s) => s.metadata.truth_ops.integrity_score);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
}
```

### 4. Narrative Analysis (Agent-Generated Explanations)

**Purpose**: Agent explanations subject to narrative collision detection

```typescript
class SummitGovernedAgent extends Agent {
  /**
   * Generate explanation for decision/action
   */
  async generateExplanation(decision: Decision, audience: string): Promise<Explanation> {
    // Generate explanation using LLM
    const explanation = await this.llm.generate({
      prompt: this.buildExplanationPrompt(decision, audience),
      max_tokens: 500,
    });

    // Submit to narrative analysis
    const narrative_check = await this.summit.truth_ops.narrativeAnalysis({
      explanation: explanation,
      decision: decision,
      agent_id: this.agent_id,
      event_id: decision.event_id,
    });

    // Check for narrative attack indicators
    if (narrative_check.flags.length > 0) {
      // Explanation exhibits concerning patterns
      const warnings = narrative_check.flags
        .map((f) => `- ${f.indicator}: ${f.evidence}`)
        .join("\n");

      // Add narrative health disclaimer
      return {
        content: explanation,
        summit_narrative_warnings: narrative_check.flags,
        disclaimer:
          `Note: This explanation exhibits ${narrative_check.flags.length} ` +
          `narrative health concerns:\n${warnings}\n\n` +
          `Consider alternative framings or additional explanations.`,
      };
    }

    return {
      content: explanation,
      summit_narrative_validated: true,
    };
  }
}
```

### 5. Strategic Silence Capability

**Purpose**: Agents can choose governed inaction

```typescript
class SummitGovernedAgent extends Agent {
  /**
   * Evaluate whether to act or exercise strategic silence
   */
  async evaluateActionNecessity(context: TaskContext): Promise<ActionDecision> {
    // Assess information completeness
    const info_completeness = await this.assessInformationCompleteness(context);

    // Assess decision urgency
    const urgency = await this.assessUrgency(context);

    // Calculate expected value of acting vs. waiting
    const ev_act = await this.calculateExpectedValueOfAction(context, info_completeness);

    const ev_wait = await this.calculateExpectedValueOfWaiting(context, info_completeness, urgency);

    if (ev_wait > ev_act) {
      // Strategic silence is optimal

      // Submit silence decision to Summit
      const silence_decision = await this.summit.sovereignty.recordStrategicSilence({
        agent_id: this.agent_id,
        context: context,
        silence_type: "UNCERTAINTY",
        justification:
          `Insufficient information (${(info_completeness * 100).toFixed(0)}%). ` +
          `Expected value of waiting (${ev_wait.toFixed(2)}) exceeds ` +
          `expected value of acting (${ev_act.toFixed(2)}).`,
        expected_information_arrival: this.estimateInformationArrival(context),
        review_deadline: this.calculateReviewDeadline(urgency),
      });

      return {
        action: "STRATEGIC_SILENCE",
        silence_decision: silence_decision,
        message:
          `Choosing strategic silence. Insufficient information to act confidently. ` +
          `Review in ${silence_decision.review_in_minutes} minutes.`,
      };
    }

    // Acting is optimal
    return {
      action: "PROCEED",
      confidence: info_completeness,
    };
  }
}
```

---

## Agent Behavioral Constraints

### Constraint 1: Integrity-Aware Tool Selection

**Rule**: Agents must prefer high-integrity tools over low-integrity tools

```typescript
interface ToolWithIntegrity {
  tool_name: string;
  integrity_score: number;
  last_validated: Date;
}

class SummitGovernedAgent extends Agent {
  async selectTool(task: string, available_tools: ToolWithIntegrity[]): Promise<string> {
    // Filter to tools with acceptable integrity
    const valid_tools = available_tools.filter((t) => t.integrity_score >= 0.6);

    if (valid_tools.length === 0) {
      throw new NoValidToolsError("No tools meet integrity requirements for this task");
    }

    // Sort by integrity score (descending)
    valid_tools.sort((a, b) => b.integrity_score - a.integrity_score);

    // Select highest-integrity tool capable of task
    for (const tool of valid_tools) {
      if (await this.isToolCapableOfTask(tool.tool_name, task)) {
        return tool.tool_name;
      }
    }

    throw new NoCapableToolError("No high-integrity tool capable of performing this task");
  }
}
```

### Constraint 2: Source Diversity Requirements

**Rule**: Agents must consult multiple independent sources

```typescript
class SummitGovernedAgent extends Agent {
  private MIN_SOURCES = 2;
  private MIN_NON_AI_SOURCES = 1;

  async gatherInformation(context: DecisionContext): Promise<InformationSource[]> {
    const sources: InformationSource[] = [];

    // Gather from multiple source types
    sources.push(await this.queryDatabase(context));
    sources.push(await this.queryExternalAPI(context));

    // Check if AI source is permitted
    const ai_permitted = await this.summit.sovereignty.checkAIConsultationPermitted({
      agent_id: this.agent_id,
      domain: this.domain,
    });

    if (ai_permitted) {
      sources.push(await this.queryAIModel(context));
    }

    // Ensure diversity requirements
    const non_ai_sources = sources.filter((s) => s.type !== "ai_model");

    if (sources.length < this.MIN_SOURCES) {
      throw new InsufficientSourcesError(
        `Required ${this.MIN_SOURCES} sources, gathered ${sources.length}`
      );
    }

    if (non_ai_sources.length < this.MIN_NON_AI_SOURCES) {
      throw new InsufficientNonAISourcesError(
        `Required ${this.MIN_NON_AI_SOURCES} non-AI sources, gathered ${non_ai_sources.length}`
      );
    }

    return sources;
  }
}
```

### Constraint 3: Uncertainty Preservation

**Rule**: Agents must maintain and communicate uncertainty, not over-claim confidence

```typescript
class SummitGovernedAgent extends Agent {
  async reportFindings(decision: Decision, sources: ProcessedSource[]): Promise<Report> {
    // Calculate confidence from sources
    const confidence_scores = sources.map((s) => s.metadata.truth_ops.confidence);
    const avg_confidence = confidence_scores.reduce((a, b) => a + b, 0) / confidence_scores.length;

    // Calculate integrity from sources
    const integrity_scores = sources.map((s) => s.metadata.truth_ops.integrity_score);
    const avg_integrity = integrity_scores.reduce((a, b) => a + b, 0) / integrity_scores.length;

    // Calculate uncertainty
    const confidence_variance = this.calculateVariance(confidence_scores);
    const uncertainty = Math.sqrt(confidence_variance);

    // Build report with explicit uncertainty
    return {
      decision: decision.action,
      confidence: avg_confidence,
      integrity: avg_integrity,
      uncertainty: uncertainty,

      caveats: this.generateCaveats(sources, uncertainty),

      recommendation: this.formatRecommendation(
        decision,
        avg_confidence,
        avg_integrity,
        uncertainty
      ),

      // Required: Unexplained elements
      unexplained_elements: this.identifyUnexplainedElements(decision, sources),

      // Required: Alternative hypotheses
      alternative_hypotheses: await this.generateAlternativeHypotheses(decision, sources),
    };
  }

  private generateCaveats(sources: ProcessedSource[], uncertainty: number): string[] {
    const caveats: string[] = [];

    if (uncertainty > 0.15) {
      caveats.push(
        `High uncertainty (±${(uncertainty * 100).toFixed(1)}%) due to source disagreement`
      );
    }

    const low_integrity = sources.filter((s) => s.metadata.truth_ops.integrity_score < 0.7);
    if (low_integrity.length > 0) {
      caveats.push(`${low_integrity.length} sources have medium/low integrity`);
    }

    return caveats;
  }

  private identifyUnexplainedElements(decision: Decision, sources: ProcessedSource[]): string[] {
    // Identify facts not explained by decision
    // This prevents premature closure
    const all_facts = this.extractFacts(sources);
    const explained_facts = this.getFactsExplainedBy(decision);

    return all_facts.filter((fact) => !explained_facts.includes(fact));
  }

  private async generateAlternativeHypotheses(
    decision: Decision,
    sources: ProcessedSource[]
  ): Promise<AlternativeHypothesis[]> {
    // Required: Generate alternative explanations
    // Prevents narrative attack (single story dominance)
    const alternatives = await this.llm.generate({
      prompt:
        `Given this decision: "${decision.action}"\n\n` +
        `Generate 2-3 alternative decisions that could also fit the evidence.\n` +
        `For each alternative, explain its strengths and weaknesses.`,
      temperature: 0.9, // Higher temperature for diversity
    });

    return this.parseAlternatives(alternatives);
  }
}
```

### Constraint 4: Adversarial Self-Awareness

**Rule**: Agents must recognize when they might be part of an attack

```typescript
class SummitGovernedAgent extends Agent {
  async performAdversarialSelfCheck(): Promise<SelfCheckResult> {
    // Check if agent behavior is anomalous
    const behavioral_check = await this.summit.truth_ops.checkAgentBehavior({
      agent_id: this.agent_id,
      recent_actions: await this.getRecentActions(24), // Last 24 hours
    });

    if (behavioral_check.anomalous) {
      // Agent behavior is unusual
      const anomalies = behavioral_check.anomalies
        .map((a) => `- ${a.type}: ${a.description}`)
        .join("\n");

      return {
        status: "ANOMALOUS",
        message:
          `Self-check detected anomalous behavior:\n${anomalies}\n\n` +
          `Possible explanations:\n` +
          `1. Agent has been compromised\n` +
          `2. Agent is operating in unusual context\n` +
          `3. Agent's training data was poisoned\n\n` +
          `Recommendation: Human review required before continuing high-stakes operations.`,
        recommendation: "HUMAN_REVIEW",
      };
    }

    // Check if agent might be amplifying misinformation
    const misinformation_check = await this.summit.truth_ops.checkMisinformationAmplification({
      agent_id: this.agent_id,
      recent_outputs: await this.getRecentOutputs(100),
    });

    if (misinformation_check.risk_detected) {
      return {
        status: "MISINFORMATION_RISK",
        message:
          `Self-check detected potential misinformation amplification.\n` +
          `Risk factors: ${misinformation_check.risk_factors.join(", ")}\n\n` +
          `Recommendation: Increase source diversity and integrity requirements.`,
        recommendation: "INCREASE_SCRUTINY",
      };
    }

    return {
      status: "HEALTHY",
      message: "No adversarial indicators detected in self-check",
    };
  }
}
```

---

## Agent SDK Integration Guide

### Step 1: Install Summit Runtime

```bash
npm install @summit/runtime
# or
yarn add @summit/runtime
```

### Step 2: Extend Your Agent Class

```typescript
import { SummitGovernedAgent } from "@summit/agent-sdk-integration";
import { Agent } from "@claude/agent-sdk";

class MyGovernedAgent extends SummitGovernedAgent {
  constructor() {
    super({
      agent_id: "my-agent-001",
      domain: "financial_analysis",
      capabilities: ["data_analysis", "report_generation"],
      summit_config: {
        mode: "FULL_ENFORCEMENT",
        integrity_threshold: 0.7,
        sovereignty_quota: 0.8,
      },
    });
  }

  // Your agent implementation
  async performTask(task: Task): Promise<Result> {
    // All tool calls, decisions, and outputs automatically governed
    return await super.performTask(task);
  }
}
```

### Step 3: Configure Enforcement Levels

```typescript
const agent = new MyGovernedAgent();

// Configure per-domain thresholds
agent.summit.configure({
  domains: {
    financial_analysis: {
      min_integrity: 0.8, // Higher for financial decisions
      min_sources: 3,
      require_human_review: true,
    },
    content_generation: {
      min_integrity: 0.6, // Lower for non-critical content
      min_sources: 2,
      require_human_review: false,
    },
  },
});
```

---

## Testing Governed Agents

### Test 1: Integrity Violation

```typescript
test("agent rejects low-integrity information", async () => {
  const agent = new MyGovernedAgent();

  // Simulate low-integrity source
  const low_integrity_source = {
    content: "Fake data",
    metadata: {
      truth_ops: {
        integrity_score: 0.25, // Below threshold
      },
    },
  };

  await expect(agent.makeDecisionUsing([low_integrity_source])).rejects.toThrow(
    IntegrityViolationError
  );
});
```

### Test 2: Sovereignty Quota Enforcement

```typescript
test("agent respects AI involvement quota", async () => {
  const agent = new MyGovernedAgent();

  // Make many AI-assisted decisions
  for (let i = 0; i < 10; i++) {
    await agent.makeDecision({ ai_assisted: true });
  }

  // Next decision should trigger quota
  await expect(agent.makeDecision({ ai_assisted: true })).rejects.toThrow(
    SovereigntyViolationError
  );
});
```

### Test 3: Source Diversity Requirement

```typescript
test("agent requires multiple sources", async () => {
  const agent = new MyGovernedAgent();

  const single_source = [{ content: "Data from one source" }];

  await expect(agent.makeDecisionUsing(single_source)).rejects.toThrow(DiversityRequirementError);
});
```

---

## Conclusion

Summit-governed agents inherit epistemic defenses by default:

✓ Integrity-aware tool selection
✓ Source diversity enforcement
✓ Policy-compliant decision-making
✓ Narrative health validation
✓ Strategic silence capability
✓ Sovereignty quota compliance
✓ Adversarial self-awareness

**Agents as governed entities. Truth operations as default behavior.**

This is how autonomous systems operate under epistemic constraints.

---

**Document Status**: Canonical
**Last Updated**: 2026-01-01
**Owner**: Summit Agent SDK Team
