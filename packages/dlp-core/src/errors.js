"use strict";
/**
 * DLP Error Classes
 * @package dlp-core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionError = exports.ConfigurationError = exports.PolicyEvaluationError = exports.RedactionError = exports.BarrierViolationError = exports.DetectionError = exports.DLPError = void 0;
/**
 * Base DLP error
 */
class DLPError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'DLPError';
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.DLPError = DLPError;
/**
 * Detection error - issues during content scanning
 */
class DetectionError extends DLPError {
    constructor(message, details) {
        super(message, 'DETECTION_ERROR', details);
        this.name = 'DetectionError';
    }
}
exports.DetectionError = DetectionError;
/**
 * Barrier violation error - data flow blocked by information barrier
 */
class BarrierViolationError extends DLPError {
    barrierType;
    sourceContext;
    targetContext;
    constructor(message, barrierType, sourceContext, targetContext) {
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
exports.BarrierViolationError = BarrierViolationError;
/**
 * Redaction error - issues during content redaction
 */
class RedactionError extends DLPError {
    constructor(message, details) {
        super(message, 'REDACTION_ERROR', details);
        this.name = 'RedactionError';
    }
}
exports.RedactionError = RedactionError;
/**
 * Policy evaluation error - issues with OPA policy evaluation
 */
class PolicyEvaluationError extends DLPError {
    policyId;
    constructor(message, policyId, details) {
        super(message, 'POLICY_EVALUATION_ERROR', { policyId, ...details });
        this.name = 'PolicyEvaluationError';
        this.policyId = policyId;
    }
}
exports.PolicyEvaluationError = PolicyEvaluationError;
/**
 * Configuration error - invalid DLP configuration
 */
class ConfigurationError extends DLPError {
    constructor(message, details) {
        super(message, 'CONFIGURATION_ERROR', details);
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
/**
 * Exception error - issues with DLP exceptions
 */
class ExceptionError extends DLPError {
    exceptionId;
    constructor(message, exceptionId, details) {
        super(message, 'EXCEPTION_ERROR', { exceptionId, ...details });
        this.name = 'ExceptionError';
        this.exceptionId = exceptionId;
    }
}
exports.ExceptionError = ExceptionError;
