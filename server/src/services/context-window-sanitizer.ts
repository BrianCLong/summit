import { createHash } from "crypto";

export type SanitizationPurpose =
  | "analysis"
  | "summarization"
  | "safety"
  | "tracing";

export interface RetrievalChunk {
  id: string;
  type: "entity" | "relationship" | "document";
  content: string;
  metadata?: Record<string, any>;
  score?: number;
}

export interface ExplainTrace {
  minimization: string;
  redactions: string[];
  truncation?: string | null;
  quality: {
    answerability: number;
    exposure: number;
  };
}

export interface SanitizedChunk extends RetrievalChunk {
  metadata?: Record<string, any>;
  explain: ExplainTrace;
  truncated: boolean;
}

export interface QualityMeter {
  answerability: {
    baseline: number;
    sanitized: number;
    retention: number;
  };
  exposure: {
    baseline: number;
    sanitized: number;
    reduction: number;
  };
  status: "balanced" | "needs_review";
}

export interface SanitizationResult {
  sanitizedChunks: SanitizedChunk[];
  explainTraces: Record<string, ExplainTrace>;
  quality: QualityMeter;
  fingerprint: string;
}

interface ContextWindowSanitizerConfig {
  allowedMetadataFields: string[];
  truncationLimits: Record<SanitizationPurpose, number>;
  thresholds: {
    minAnswerabilityRetention: number;
    maxSanitizedExposure: number;
  };
}

const DEFAULT_CONFIG: ContextWindowSanitizerConfig = {
  allowedMetadataFields: ["score", "source", "timestamp", "type", "spomTags"],
  truncationLimits: {
    analysis: 640,
    summarization: 420,
    safety: 280,
    tracing: 880,
  },
  thresholds: {
    minAnswerabilityRetention: 0.8,
    maxSanitizedExposure: 2,
  },
};

const SPOM_LABELS: Record<string, string> = {
  S: "Sensitive",
  P: "Personal",
  O: "Operational",
  M: "Mission",
};

const PII_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: "Email", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { label: "Phone", regex: /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { label: "API", regex: /\b(?:sk|pk|AKIA|ya29\.)[A-Za-z0-9_-]{16,}\b/g },
];

export class ContextWindowSanitizer {
  private readonly config: ContextWindowSanitizerConfig;

  constructor(config: Partial<ContextWindowSanitizerConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      truncationLimits: {
        ...DEFAULT_CONFIG.truncationLimits,
        ...(config.truncationLimits || {}),
      },
      thresholds: {
        ...DEFAULT_CONFIG.thresholds,
        ...(config.thresholds || {}),
      },
      allowedMetadataFields:
        config.allowedMetadataFields ?? DEFAULT_CONFIG.allowedMetadataFields,
    };
  }

  sanitize(
    chunks: RetrievalChunk[],
    options: { purpose?: SanitizationPurpose; question?: string } = {},
  ): SanitizationResult {
    const purpose = options.purpose ?? "analysis";
    const baselineAnswerability = this.computeAnswerability(chunks);
    const baselineExposure = this.computeExposure(chunks);

    const sanitizedChunks = chunks.map((chunk) =>
      this.sanitizeChunk(chunk, purpose),
    );

    const sanitizedAnswerability = this.computeAnswerability(sanitizedChunks);
    const sanitizedExposure = this.computeExposure(sanitizedChunks);

    const quality = this.buildQualityMeter({
      baselineAnswerability,
      sanitizedAnswerability,
      baselineExposure,
      sanitizedExposure,
    });

    const explainTraces = sanitizedChunks.reduce<Record<string, ExplainTrace>>(
      (acc, chunk) => {
        acc[chunk.id] = chunk.explain;
        return acc;
      },
      {},
    );

    const fingerprint = this.createFingerprint(sanitizedChunks, quality, options);

    return { sanitizedChunks, explainTraces, quality, fingerprint };
  }

  private sanitizeChunk(
    chunk: RetrievalChunk,
    purpose: SanitizationPurpose,
  ): SanitizedChunk {
    const metadata = chunk.metadata || {};
    const keptMetadata: Record<string, any> = {};
    const removedFields: string[] = [];

    Object.entries(metadata).forEach(([key, value]) => {
      if (this.config.allowedMetadataFields.includes(key)) {
        keptMetadata[key] = value;
      } else if (key.startsWith("cws_")) {
        keptMetadata[key] = value;
      } else if (typeof value === "string" && value.startsWith("cws:")) {
        keptMetadata[key] = value;
      } else {
        removedFields.push(key);
      }
    });

    const redactionResult = this.applySemanticRedaction(
      chunk.content,
      keptMetadata,
    );

    const truncationResult = this.truncateForPurpose(
      redactionResult.content,
      purpose,
    );

    const sanitized: SanitizedChunk = {
      ...chunk,
      content: truncationResult.content,
      metadata: Object.keys(keptMetadata).length ? keptMetadata : undefined,
      truncated: truncationResult.truncated,
      explain: {
        minimization: removedFields.length
          ? `Removed metadata fields: ${removedFields.sort().join(", ")}`
          : "Metadata already minimal",
        redactions: redactionResult.redactions,
        truncation: truncationResult.detail,
        quality: { answerability: 1, exposure: 1 },
      },
    };

    sanitized.explain.quality = this.computePerChunkQuality(chunk, sanitized);

    return sanitized;
  }

  private computePerChunkQuality(
    baseline: RetrievalChunk,
    sanitized: SanitizedChunk,
  ): { answerability: number; exposure: number } {
    const baselineAnswerability = this.computeAnswerability([baseline]);
    const baselineExposure = this.computeExposure([baseline]);
    const sanitizedAnswerability = this.computeAnswerability([
      sanitized,
    ]);
    const sanitizedExposure = this.computeExposure([sanitized]);

    const answerabilityRatio = baselineAnswerability
      ? sanitizedAnswerability / baselineAnswerability
      : 1;

    const exposureRatio = baselineExposure
      ? sanitizedExposure / baselineExposure
      : sanitizedExposure === 0
        ? 0
        : 1;

    return {
      answerability: Number(answerabilityRatio.toFixed(3)),
      exposure: Number(exposureRatio.toFixed(3)),
    };
  }

  private applySemanticRedaction(
    content: string,
    metadata: Record<string, any>,
  ): { content: string; redactions: string[] } {
    const redactions: string[] = [];
    const spomTags = new Set<string>(
      (metadata.spomTags || metadata.tags || [])
        .map((tag: string) => tag.toString().trim().toUpperCase())
        .filter((tag: string) => ["S", "P", "O", "M"].includes(tag)),
    );

    let working = content;

    const spomPattern = /\[SPOM:([SPOM])\](.*?)\[\/SPOM\]/gis;
    working = working.replace(spomPattern, (_, tag: string, inner: string) => {
      const label = SPOM_LABELS[tag] || "Sensitive";
      const trimmed = inner.trim();
      redactions.push(`SPOM-${label}: ${trimmed}`);
      spomTags.add(tag);
      return this.createPlaceholder(label, trimmed);
    });

    PII_PATTERNS.forEach(({ label, regex }) => {
      working = working.replace(regex, (match) => {
        redactions.push(`${label}:${match}`);
        return this.createPlaceholder(label, match);
      });
    });

    if (spomTags.has("O")) {
      working = this.redactOperationalDetails(working, redactions);
    }
    if (spomTags.has("M")) {
      working = this.redactMissionTiming(working, redactions);
    }

    return { content: working, redactions };
  }

  private redactOperationalDetails(
    content: string,
    redactions: string[],
  ): string {
    const opPattern = /(window|door|ingress|egress|checkpoint)\s+([A-Z0-9-]+)/gi;
    return content.replace(opPattern, (match) => {
      redactions.push(`Operational:${match}`);
      return this.createPlaceholder("Operational", match);
    });
  }

  private redactMissionTiming(
    content: string,
    redactions: string[],
  ): string {
    const timingPattern = /(\bETA\b|\bETD\b|launch window|strike at)\s+[^,.]+/gi;
    return content.replace(timingPattern, (match) => {
      redactions.push(`Mission:${match}`);
      return this.createPlaceholder("Mission", match);
    });
  }

  private truncateForPurpose(
    content: string,
    purpose: SanitizationPurpose,
  ): { content: string; truncated: boolean; detail: string | null } {
    const limit = this.config.truncationLimits[purpose] ??
      this.config.truncationLimits.analysis;

    if (content.length <= limit) {
      return { content, truncated: false, detail: null };
    }

    const truncatedContent = this.smartTruncate(content, limit);
    const detail = `Truncated to ${limit} characters for ${purpose} purpose`;
    return { content: truncatedContent, truncated: true, detail };
  }

  private smartTruncate(content: string, limit: number): string {
    let clipped = content.slice(0, limit);
    const lastSentence = clipped.lastIndexOf(".");
    if (lastSentence > limit * 0.6) {
      clipped = clipped.slice(0, lastSentence + 1);
    }
    return clipped.trimEnd() + " …";
  }

  private computeAnswerability(chunks: RetrievalChunk[]): number {
    if (!chunks.length) {
      return 0;
    }
    return chunks.reduce((acc, chunk) => {
      const weight = chunk.score ?? chunk.metadata?.score ?? 0.6;
      const tokens = this.estimateTokens(chunk.content);
      return acc + weight * tokens;
    }, 0);
  }

  private computeExposure(chunks: RetrievalChunk[]): number {
    if (!chunks.length) {
      return 0;
    }

    let exposure = 0;
    for (const chunk of chunks) {
      const content = chunk.content || "";
      const containsRedaction = content.includes("[REDACTED");
      PII_PATTERNS.forEach(({ regex }) => {
        const matches = content.match(regex);
        if (matches) {
          exposure += matches.length * 2;
        }
      });

      const spomTags: string[] = (chunk.metadata?.spomTags || [])
        .map((tag: string) => tag.toString().toUpperCase());
      spomTags.forEach((tag) => {
        if (tag in SPOM_LABELS) {
          exposure += containsRedaction ? 0.25 : 1;
        }
      });
    }

    return exposure;
  }

  private buildQualityMeter(params: {
    baselineAnswerability: number;
    sanitizedAnswerability: number;
    baselineExposure: number;
    sanitizedExposure: number;
  }): QualityMeter {
    const retention = params.baselineAnswerability
      ? params.sanitizedAnswerability / params.baselineAnswerability
      : 1;

    const reduction = params.baselineExposure
      ? (params.baselineExposure - params.sanitizedExposure) /
        params.baselineExposure
      : params.sanitizedExposure === 0
        ? 1
        : 0;

    const status =
      retention >= this.config.thresholds.minAnswerabilityRetention &&
      params.sanitizedExposure <= this.config.thresholds.maxSanitizedExposure
        ? "balanced"
        : "needs_review";

    return {
      answerability: {
        baseline: params.baselineAnswerability,
        sanitized: params.sanitizedAnswerability,
        retention: Number(retention.toFixed(3)),
      },
      exposure: {
        baseline: params.baselineExposure,
        sanitized: params.sanitizedExposure,
        reduction: Number(reduction.toFixed(3)),
      },
      status,
    };
  }

  private estimateTokens(content: string): number {
    if (!content) {
      return 0;
    }
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words * 0.75));
  }

  private createPlaceholder(label: string, original: string): string {
    const tokenEstimate = Math.max(1, this.estimateTokens(original));
    const bucket = tokenEstimate > 12 ? "long span" : `${tokenEstimate} tokens`;
    return `[REDACTED ${label} approx ${bucket}]`;
  }

  private createFingerprint(
    chunks: SanitizedChunk[],
    quality: QualityMeter,
    options: { purpose?: SanitizationPurpose; question?: string },
  ): string {
    const hash = createHash("sha256");
    hash.update(JSON.stringify({
      purpose: options.purpose ?? "analysis",
      question: options.question ?? "",
      chunks: chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        metadata: chunk.metadata,
      })),
      quality,
    }));
    return hash.digest("hex").slice(0, 16);
  }
}

