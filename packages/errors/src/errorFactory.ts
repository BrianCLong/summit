import { v4 as uuidv4 } from "uuid";

import { createLogger } from "@intelgraph/logger";

export const ErrorCategories = [
  "auth",
  "validation",
  "rate-limit",
  "internal",
  "LLM",
  "upstream",
] as const;

export type ErrorCategory = (typeof ErrorCategories)[number];

export interface ErrorEnvelope {
  error_code: string;
  human_message: string;
  developer_message?: string;
  category: ErrorCategory;
  trace_id: string;
  suggested_action?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface ErrorFactoryInput {
  errorCode: string;
  humanMessage: string;
  developerMessage?: string;
  suggestedAction?: string;
  traceId?: string;
  context?: Record<string, unknown>;
  statusCode?: number;
  cause?: unknown;
}

const categoryStatusMap: Record<ErrorCategory, number> = {
  auth: 401,
  validation: 422,
  "rate-limit": 429,
  internal: 500,
  LLM: 502,
  upstream: 502,
};

const logger = createLogger({ serviceName: process.env.SERVICE_NAME || "platform-errors" });

export class SummitError extends Error {
  envelope: ErrorEnvelope;
  statusCode: number;

  constructor(envelope: ErrorEnvelope, statusCode: number, cause?: unknown) {
    super(envelope.developer_message ?? envelope.human_message);
    this.name = "SummitError";
    this.envelope = envelope;
    this.statusCode = statusCode;

    if (cause) {
      (this as any).cause = cause;
    }
  }
}

function normalizeCategory(category: string): ErrorCategory {
  const normalized = category as ErrorCategory;
  return ErrorCategories.includes(normalized) ? normalized : "internal";
}

function toEnvelope(
  category: ErrorCategory,
  input: ErrorFactoryInput
): { envelope: ErrorEnvelope; statusCode: number } {
  const timestamp = new Date().toISOString();
  const normalizedCategory = normalizeCategory(category);
  const traceId = input.traceId || uuidv4();

  const envelope: ErrorEnvelope = {
    error_code: input.errorCode,
    human_message: input.humanMessage,
    developer_message: input.developerMessage,
    category: normalizedCategory,
    trace_id: traceId,
    suggested_action: input.suggestedAction,
    timestamp,
    context: input.context,
  };

  const statusCode = input.statusCode ?? categoryStatusMap[normalizedCategory] ?? 500;

  return { envelope, statusCode };
}

function buildError(category: ErrorCategory, input: ErrorFactoryInput): SummitError {
  const { envelope, statusCode } = toEnvelope(category, input);
  const summitError = new SummitError(envelope, statusCode, input.cause);

  logger.error(
    {
      event: "platform.error",
      error: envelope,
      statusCode,
    },
    envelope.developer_message || envelope.human_message
  );

  return summitError;
}

export function isSummitError(error: unknown): error is SummitError {
  return Boolean(error && (error as SummitError).envelope);
}

export const errorFactory = {
  auth: (input: ErrorFactoryInput) => buildError("auth", input),
  validation: (input: ErrorFactoryInput) => buildError("validation", input),
  rateLimit: (input: ErrorFactoryInput) => buildError("rate-limit", input),
  internal: (input: ErrorFactoryInput) => buildError("internal", input),
  llm: (input: ErrorFactoryInput) => buildError("LLM", input),
  upstream: (input: ErrorFactoryInput) => buildError("upstream", input),
  fromUnknown: (
    error: unknown,
    fallback: Omit<ErrorFactoryInput, "developerMessage"> & { category?: ErrorCategory }
  ): SummitError => {
    if (isSummitError(error)) {
      return error;
    }

    const developerMessage = error instanceof Error ? error.message : "Unknown error";
    const category = normalizeCategory(fallback.category || "internal");

    return buildError(category, {
      developerMessage,
      ...fallback,
    });
  },
};

export type ErrorFactory = typeof errorFactory;
