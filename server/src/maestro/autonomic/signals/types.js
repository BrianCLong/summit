"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthStatus = exports.SignalType = void 0;
var SignalType;
(function (SignalType) {
    // Task/Graph
    SignalType["TASK_LATENCY"] = "TASK_LATENCY";
    SignalType["TASK_SUCCESS_RATE"] = "TASK_SUCCESS_RATE";
    SignalType["TASK_RETRY_COUNT"] = "TASK_RETRY_COUNT";
    SignalType["TASK_FAILURE_COUNT"] = "TASK_FAILURE_COUNT";
    // LLM Routing
    SignalType["LLM_TOKEN_COST"] = "LLM_TOKEN_COST";
    SignalType["LLM_ERROR_RATE"] = "LLM_ERROR_RATE";
    SignalType["LLM_JSON_FAILURE"] = "LLM_JSON_FAILURE";
    SignalType["LLM_MODEL_USAGE"] = "LLM_MODEL_USAGE";
    // CI/CD
    SignalType["CI_BUILD_STATUS"] = "CI_BUILD_STATUS";
    SignalType["CI_FLAKY_TESTS"] = "CI_FLAKY_TESTS";
    SignalType["MERGE_TRAIN_QUEUE_LENGTH"] = "MERGE_TRAIN_QUEUE_LENGTH";
    // Infrastructure
    SignalType["CPU_USAGE"] = "CPU_USAGE";
    SignalType["MEMORY_USAGE"] = "MEMORY_USAGE";
    SignalType["DB_LATENCY"] = "DB_LATENCY";
    SignalType["QUEUE_DEPTH"] = "QUEUE_DEPTH";
    // Policy
    SignalType["POLICY_DENIAL"] = "POLICY_DENIAL";
    SignalType["RED_LINE_ATTEMPT"] = "RED_LINE_ATTEMPT";
    SignalType["SAFETY_FLAG"] = "SAFETY_FLAG";
    // Human Feedback
    SignalType["HUMAN_RATING"] = "HUMAN_RATING";
    SignalType["HUMAN_THUMBS"] = "HUMAN_THUMBS";
})(SignalType || (exports.SignalType = SignalType = {}));
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "HEALTHY";
    HealthStatus["DEGRADED"] = "DEGRADED";
    HealthStatus["CRITICAL"] = "CRITICAL";
    HealthStatus["UNKNOWN"] = "UNKNOWN";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
