"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackpressureStrategy = exports.LateDataStrategy = exports.JoinType = exports.StateBackend = exports.TimeSemantics = exports.WindowType = void 0;
/**
 * Window types
 */
var WindowType;
(function (WindowType) {
    WindowType["TUMBLING"] = "tumbling";
    WindowType["SLIDING"] = "sliding";
    WindowType["SESSION"] = "session";
    WindowType["GLOBAL"] = "global";
})(WindowType || (exports.WindowType = WindowType = {}));
/**
 * Time semantics
 */
var TimeSemantics;
(function (TimeSemantics) {
    TimeSemantics["EVENT_TIME"] = "event_time";
    TimeSemantics["PROCESSING_TIME"] = "processing_time";
    TimeSemantics["INGESTION_TIME"] = "ingestion_time";
})(TimeSemantics || (exports.TimeSemantics = TimeSemantics = {}));
/**
 * State backend types
 */
var StateBackend;
(function (StateBackend) {
    StateBackend["MEMORY"] = "memory";
    StateBackend["REDIS"] = "redis";
    StateBackend["ROCKSDB"] = "rocksdb";
})(StateBackend || (exports.StateBackend = StateBackend = {}));
/**
 * Join types
 */
var JoinType;
(function (JoinType) {
    JoinType["INNER"] = "inner";
    JoinType["LEFT"] = "left";
    JoinType["RIGHT"] = "right";
    JoinType["FULL_OUTER"] = "full_outer";
})(JoinType || (exports.JoinType = JoinType = {}));
/**
 * Late data handling strategy
 */
var LateDataStrategy;
(function (LateDataStrategy) {
    LateDataStrategy["DROP"] = "drop";
    LateDataStrategy["SIDE_OUTPUT"] = "side_output";
    LateDataStrategy["UPDATE_WINDOW"] = "update_window";
})(LateDataStrategy || (exports.LateDataStrategy = LateDataStrategy = {}));
/**
 * Backpressure strategy
 */
var BackpressureStrategy;
(function (BackpressureStrategy) {
    BackpressureStrategy["DROP_OLDEST"] = "drop_oldest";
    BackpressureStrategy["DROP_NEWEST"] = "drop_newest";
    BackpressureStrategy["BLOCK"] = "block";
    BackpressureStrategy["SAMPLE"] = "sample";
})(BackpressureStrategy || (exports.BackpressureStrategy = BackpressureStrategy = {}));
