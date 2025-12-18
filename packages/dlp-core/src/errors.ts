/**
 * DLP Error Classes
 * @package dlp-core
 */

/**
 * Base DLP error
 */
export class DLPError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DLPError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Detection error - issues during content scanning
 */
export class DetectionError extends DLPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DETECTION_ERROR', details);
    this.name = 'DetectionError';
  }
}

/**
 * Barrier violation error - data flow blocked by information barrier
 */
export class BarrierViolationError extends DLPError {
  public readonly barrierType: string;
  public readonly sourceContext?: Record<string, string>;
  public readonly targetContext?: Record<string, string>;

  constructor(
    message: string,
    barrierType: string,
    sourceContext?: Record<string, string>,
    targetContext?: Record<string, string>
  ) {
    super(message, 'BARRIER_VIOLATION', {
      barrierType,
      sourceContext,
      targetContext,
    });
    this.name = 'BarrierViolationError';
    this.barrierType = barrierType;
    this.sourceContext = sourceContext;
    this.targetContext = targetContext;
  }
}

/**
 * Redaction error - issues during content redaction
 */
export class RedactionError extends DLPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'REDACTION_ERROR', details);
    this.name = 'RedactionError';
  }
}

/**
 * Policy evaluation error - issues with OPA policy evaluation
 */
export class PolicyEvaluationError extends DLPError {
  public readonly policyId?: string;

  constructor(message: string, policyId?: string, details?: Record<string, unknown>) {
    super(message, 'POLICY_EVALUATION_ERROR', { policyId, ...details });
    this.name = 'PolicyEvaluationError';
    this.policyId = policyId;
  }
}

/**
 * Configuration error - invalid DLP configuration
 */
export class ConfigurationError extends DLPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

/**
 * Exception error - issues with DLP exceptions
 */
export class ExceptionError extends DLPError {
  public readonly exceptionId?: string;

  constructor(message: string, exceptionId?: string, details?: Record<string, unknown>) {
    super(message, 'EXCEPTION_ERROR', { exceptionId, ...details });
    this.name = 'ExceptionError';
    this.exceptionId = exceptionId;
  }
}
