import { AgentContext, ContextMetrics, HybridContextOptions, LLMClient, Turn } from "./types";

function placeholder(idx: number, turn: Turn, style: "compact" | "verbose") {
  if (style === "verbose") {
    const action = turn.action ? ` action=${turn.action}` : "";
    return `[Observation ${idx} omitted.${action}]`;
  }
  return `[obs:${idx}:omitted]`;
}

function estimateContextTokens(llm: LLMClient, ctx: AgentContext): number {
  const parts: string[] = [];
  if (ctx.summary) parts.push(ctx.summary);
  for (const t of ctx.turns) {
    parts.push(t.content);
    if (t.observation) parts.push(t.observation);
    if (t.action) parts.push(t.action);
    if (t.reasoning) parts.push(t.reasoning);
  }
  return llm.estimateTokens(parts.join("\n"));
}

export async function manageContext(
  llm: LLMClient,
  ctx: AgentContext,
  opts: HybridContextOptions
): Promise<{ context: AgentContext; metrics: ContextMetrics }> {
  const originalTokenEstimate = estimateContextTokens(llm, ctx);

  const style = opts.placeholderStyle ?? "compact";
  const observationWindow = Math.max(1, opts.observationWindow);

  const turns = ctx.turns.slice();
  const cutoff = Math.max(0, turns.length - observationWindow);

  let maskedTurns = 0;
  const masked = turns.map((t, i) => {
    if (i < cutoff && (t.observation || t.action)) {
      maskedTurns += 1;
      return {
        ...t,
        observation: placeholder(i, t, style),
      };
    }
    return t;
  });

  let summarized = false;
  let summary = ctx.summary;

  const interval = Math.max(0, opts.summarizationInterval);
  if (interval > 0 && masked.length > 0 && masked.length % interval === 0 && cutoff > 0) {
    summarized = true;
    const toSummarize = masked.slice(0, cutoff)
      .map(t => `${t.role}: ${t.content}${t.observation ? `\nobs: ${t.observation}` : ""}`)
      .join("\n");

    const s = await llm.summarize(toSummarize);
    const maxChars = opts.maxSummaryChars ?? 2000;
    summary = s.length > maxChars ? s.slice(0, maxChars) : s;
  }

  const managed: AgentContext = {
    ...ctx,
    summary,
    turns: summarized ? masked.slice(cutoff) : masked,
  };

  const managedTokenEstimate = estimateContextTokens(llm, managed);

  return {
    context: managed,
    metrics: {
      originalTokenEstimate,
      managedTokenEstimate,
      estimatedCostReduction:
        originalTokenEstimate <= 0 ? 0 : 1 - managedTokenEstimate / originalTokenEstimate,
      maskedTurns,
      summarized,
    },
  };
}
