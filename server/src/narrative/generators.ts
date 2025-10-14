import type {
  LLMClient,
  LLMNarrativeRequest,
  NarrativeGeneratorMode,
  NarrativeNarration,
  NarrativeState,
  NarrativeEvent,
} from "./types.js";

export interface NarrativeGenerator {
  readonly mode: NarrativeGeneratorMode;
  generate(state: NarrativeState, recentEvents: NarrativeEvent[]): Promise<NarrativeNarration>;
}

const MOMENTUM_LABELS: Record<string, string> = {
  improving: "rising",
  degrading: "sliding",
  steady: "steady",
};

export class RuleBasedNarrativeGenerator implements NarrativeGenerator {
  readonly mode: NarrativeGeneratorMode = "rule-based";

  async generate(state: NarrativeState, recentEvents: NarrativeEvent[]): Promise<NarrativeNarration> {
    const highlightPieces = state.arcs.map((arc) => {
      const label = MOMENTUM_LABELS[arc.outlook];
      const entities = arc.keyEntities.length ? `Actors: ${arc.keyEntities.join(", ")}.` : "";
      return {
        theme: arc.theme,
        text: `${arc.theme} is ${label} with momentum ${(arc.momentum * 100).toFixed(0)}% and confidence ${(arc.confidence * 100).toFixed(0)}%. ${entities}`.trim(),
      };
    });

    const riskSignals = highlightPieces
      .filter((h) => h.text.includes("sliding") || h.text.includes("degrading"))
      .map((h) => `Watch ${h.theme} — outlook deteriorating.`);

    const opportunitySignals = highlightPieces
      .filter((h) => h.text.includes("rising") || h.text.includes("improving"))
      .map((h) => `Capitalize on ${h.theme} momentum.`);

    const primaryArc = state.arcs.sort((a, b) => b.momentum - a.momentum)[0];
    const summary = primaryArc
      ? `Tick ${state.tick}: ${primaryArc.theme} dominates the narrative with ${(primaryArc.momentum * 100).toFixed(
          1,
        )}% momentum.`
      : `Tick ${state.tick}: Narrative remains in equilibrium.`;

    const recent = recentEvents.slice(-3).map((event) => `${event.type} event: ${event.description}`);
    const summaryWithEvents = recent.length ? `${summary} Recent drivers: ${recent.join("; ")}.` : summary;

    return {
      mode: this.mode,
      summary: summaryWithEvents,
      highlights: highlightPieces,
      risks: riskSignals,
      opportunities: opportunitySignals,
    };
  }
}

export class LLMDrivenNarrativeGenerator implements NarrativeGenerator {
  readonly mode: NarrativeGeneratorMode = "llm";
  private readonly llmClient: LLMClient;
  private readonly fallback: RuleBasedNarrativeGenerator;

  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
    this.fallback = new RuleBasedNarrativeGenerator();
  }

  async generate(state: NarrativeState, recentEvents: NarrativeEvent[]): Promise<NarrativeNarration> {
    const request: LLMNarrativeRequest = { state, recentEvents };
    try {
      const response = await this.llmClient.generateNarrative(request);
      const highlights = state.arcs.map((arc) => ({
        theme: arc.theme,
        text: arc.narrative,
      }));

      return {
        mode: this.mode,
        summary: response,
        highlights,
        risks: this.extractLines(response, /risk:/i),
        opportunities: this.extractLines(response, /opportunity:/i),
      };
    } catch (error) {
      const fallbackResult = await this.fallback.generate(state, recentEvents);
      return {
        ...fallbackResult,
        mode: this.mode,
        summary: `${fallbackResult.summary} (LLM unavailable, fallback engaged)`,
      };
    }
  }

  private extractLines(text: string, pattern: RegExp): string[] {
    return text
      .split(/\n|\.\s/)
      .map((line) => line.trim())
      .filter((line) => pattern.test(line))
      .map((line) => line.replace(pattern, "").trim())
      .filter(Boolean);
  }
}
