import validator from "validator";
import { securityLogger } from "../observability/securityLogger.js";

const MAX_PAYLOAD_BYTES = 1024 * 1024 * 5; // 5MB

export interface DropInput {
  payload: string;
  metadata?: string;
}

export interface SanitizedDropInput {
  payload: Buffer;
  metadata?: Record<string, unknown>;
}

export const validateAndSanitizeDropInput = (input: DropInput): SanitizedDropInput => {
  if (!input || typeof input.payload !== "string") {
    securityLogger.logEvent("drop_validation_failed", {
      level: "warn",
      message: "Payload missing or not a string",
    });
    throw new Error("Invalid payload");
  }

  if (!validator.isBase64(input.payload, { urlSafe: false })) {
    securityLogger.logEvent("drop_validation_failed", {
      level: "warn",
      message: "Payload is not valid base64",
    });
    throw new Error("Payload must be base64 encoded");
  }

  const decoded = Buffer.from(input.payload, "base64");
  if (decoded.byteLength > MAX_PAYLOAD_BYTES) {
    securityLogger.logEvent("drop_validation_failed", {
      level: "warn",
      message: "Payload exceeds maximum size",
    });
    throw new Error("Payload size exceeds limit");
  }

  let metadata: Record<string, unknown> | undefined;
  if (input.metadata) {
    const sanitizedMetadata = validator.stripLow(input.metadata, true);
    try {
      metadata = JSON.parse(sanitizedMetadata);
    } catch (error) {
      securityLogger.logEvent("drop_validation_failed", {
        level: "warn",
        message: "Metadata is not valid JSON",
      });
      throw new Error("Metadata must be valid JSON");
    }
  }

  return {
    payload: decoded,
    metadata,
  };
};
