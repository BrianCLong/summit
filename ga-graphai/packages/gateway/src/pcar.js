import { createHash, createHmac } from 'node:crypto';

const DEFAULT_OPTIONS = {
  secret: 'pcar-dev-secret',
  seed: 0,
  highImpactThreshold: 0.25,
};

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function computeTokenDifference(baseline, variant) {
  if (!Array.isArray(baseline) || baseline.length === 0) {
    return 0;
  }
  const counts = new Map();
  baseline.forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });
  variant.forEach((token) => {
    const current = counts.get(token);
    if (current && current > 0) {
      if (current === 1) {
        counts.delete(token);
      } else {
        counts.set(token, current - 1);
      }
    }
  });
  const missing = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
  return Math.min(1, missing / baseline.length);
}

function computeOcclusionImpact(baselineTokens, snippet, emphasis) {
  if (!Array.isArray(baselineTokens) || baselineTokens.length === 0) {
    return 0;
  }
  const snippetTokens = tokenize(snippet ?? '');
  if (snippetTokens.length === 0) {
    return 0;
  }
  const counts = new Map();
  snippetTokens.forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });
  let overlap = 0;
  baselineTokens.forEach((token) => {
    const current = counts.get(token);
    if (current && current > 0) {
      overlap += 1;
      if (current === 1) {
        counts.delete(token);
      } else {
        counts.set(token, current - 1);
      }
    }
  });
  const baseScore = overlap / baselineTokens.length;
  return Math.min(1, baseScore * emphasis);
}

function buildHighlightSpans(text, snippet) {
  const trimmed = (snippet ?? '').trim();
  if (!trimmed) {
    return [];
  }
  const spans = [];
  const lowerText = text.toLowerCase();
  const lowerSnippet = trimmed.toLowerCase();
  let cursor = 0;
  while (cursor <= lowerText.length - lowerSnippet.length) {
    const index = lowerText.indexOf(lowerSnippet, cursor);
    if (index === -1) {
      break;
    }
    const end = index + trimmed.length;
    spans.push({
      start: index,
      end,
      text: text.slice(index, end),
    });
    cursor = end;
  }
  return spans;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

export class PromptContextAttributionReporter {
  constructor(options = {}) {
    this.options = {
      secret: options.secret ?? DEFAULT_OPTIONS.secret,
      seed: options.seed ?? DEFAULT_OPTIONS.seed,
      highImpactThreshold:
        options.highImpactThreshold ?? DEFAULT_OPTIONS.highImpactThreshold,
    };
  }

  async evaluate(context) {
    const baselineTokens = tokenize(context.outputText ?? '');
    const baselineHash = createHash('sha256')
      .update(context.outputText ?? '')
      .digest('hex');
    const timestampSource = this.options.seed > 0 ? this.options.seed * 1000 : Date.now();
    const timestamp = new Date(timestampSource).toISOString();

    const retrievalScores = await this.scoreRetrievalChunks({
      baselineTokens,
      generator: context.generator,
      retrievalChunks: context.retrievalChunks ?? [],
      promptSegments: context.promptSegments ?? [],
    });
    const promptScores = await this.scorePromptSegments({
      baselineTokens,
      generator: context.generator,
      retrievalChunks: context.retrievalChunks ?? [],
      promptSegments: context.promptSegments ?? [],
    });

    const sources = [
      ...(context.retrievalChunks ?? []).map((chunk) => {
        const result = retrievalScores.get(chunk.id);
        const metadata = {
          type: 'retrieval',
          mustInclude: chunk.mustInclude ?? false,
        };
        const highlights = buildHighlightSpans(context.outputText ?? '', chunk.content ?? '');
        return {
          id: chunk.id,
          type: 'retrieval',
          label: chunk.label,
          score: result?.score ?? 0,
          snippet: chunk.content,
          methodContributions: result?.contributions ?? [],
          highlightSpans: highlights,
          metadata,
        };
      }),
      ...(context.promptSegments ?? []).map((segment) => {
        const result = promptScores.get(segment.id);
        const metadata = {
          type: 'prompt',
          role: segment.role,
          mustInclude: segment.mustInclude ?? false,
        };
        const highlights = buildHighlightSpans(context.outputText ?? '', segment.content ?? '');
        return {
          id: segment.id,
          type: 'prompt',
          label: segment.role,
          score: result?.score ?? 0,
          snippet: segment.content,
          methodContributions: result?.contributions ?? [],
          highlightSpans: highlights,
          metadata,
        };
      }),
    ].sort((a, b) => {
      if (b.score === a.score) {
        return a.id.localeCompare(b.id);
      }
      return b.score - a.score;
    });

    const metadata = {
      seed: this.options.seed,
      retrievalCount: (context.retrievalChunks ?? []).length,
      promptCount: (context.promptSegments ?? []).length,
      highImpactThreshold: this.options.highImpactThreshold,
    };
    if (context.runId) {
      metadata.runId = context.runId;
    }

    const bundleBase = {
      version: 'pcar.v1',
      createdAt: timestamp,
      seed: this.options.seed,
      baselineHash,
      outputText: context.outputText ?? '',
      tokens: baselineTokens,
      sources,
      metadata,
    };

    const signature = this.sign(bundleBase);
    const bundleId = createHash('sha256').update(signature).digest('hex').slice(0, 24);

    return {
      ...bundleBase,
      bundleId,
      signature,
    };
  }

  static replayHighlights(bundle, secret) {
    if (secret) {
      const recomputed = createHmac('sha256', secret)
        .update(
          JSON.stringify({
            version: bundle.version,
            createdAt: bundle.createdAt,
            seed: bundle.seed,
            baselineHash: bundle.baselineHash,
            outputText: bundle.outputText,
            tokens: bundle.tokens,
            sources: bundle.sources,
            metadata: bundle.metadata ?? {},
          }),
        )
        .digest('hex');
      if (recomputed !== bundle.signature) {
        throw new Error('INVALID_SIGNATURE');
      }
    }
    const highlights = {};
    bundle.sources.forEach((source) => {
      highlights[source.id] = source.highlightSpans.map((span) => ({
        start: span.start,
        end: span.end,
        text: span.text,
      }));
    });
    return highlights;
  }

  async scoreRetrievalChunks(input) {
    const results = new Map();
    for (const chunk of input.retrievalChunks ?? []) {
      const variantChunks = input.retrievalChunks.filter(
        (candidate) => candidate.id !== chunk.id,
      );
      const variantOutput = await input.generator({
        retrievalChunks: variantChunks,
        promptSegments: input.promptSegments,
      });
      const variantTokens = tokenize(variantOutput ?? '');
      const looDelta = computeTokenDifference(input.baselineTokens, variantTokens);
      const occlusionDelta = computeOcclusionImpact(
        input.baselineTokens,
        chunk.content ?? '',
        chunk.mustInclude ? 1.6 : 1,
      );
      const bonus = chunk.mustInclude ? 0.1 : 0;
      const combined = Math.min(1, 0.65 * looDelta + 0.35 * occlusionDelta + bonus);
      results.set(chunk.id, {
        score: round(combined),
        contributions: [
          { method: 'leave-one-out', delta: round(looDelta) },
          { method: 'token-occlusion', delta: round(occlusionDelta) },
        ],
        metadata: { mustInclude: chunk.mustInclude ?? false },
      });
    }
    return results;
  }

  async scorePromptSegments(input) {
    const results = new Map();
    for (const segment of input.promptSegments ?? []) {
      const variantSegments = input.promptSegments.filter(
        (candidate) => candidate.id !== segment.id,
      );
      const variantOutput = await input.generator({
        retrievalChunks: input.retrievalChunks,
        promptSegments: variantSegments,
      });
      const variantTokens = tokenize(variantOutput ?? '');
      const looDelta = computeTokenDifference(input.baselineTokens, variantTokens);
      const occlusionDelta = computeOcclusionImpact(
        input.baselineTokens,
        segment.content ?? '',
        segment.mustInclude ? 1.3 : 0.8,
      );
      const bonus = segment.mustInclude ? 0.05 : 0;
      const combined = Math.min(1, 0.55 * looDelta + 0.45 * occlusionDelta + bonus);
      results.set(segment.id, {
        score: round(combined),
        contributions: [
          { method: 'leave-one-out', delta: round(looDelta) },
          { method: 'token-occlusion', delta: round(occlusionDelta) },
        ],
        metadata: { role: segment.role },
      });
    }
    return results;
  }

  sign(payload) {
    return createHmac('sha256', this.options.secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}

export function __test__internals() {
  return {
    tokenize,
    computeTokenDifference,
    computeOcclusionImpact,
    buildHighlightSpans,
  };
}
