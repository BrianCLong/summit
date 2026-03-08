"use strict";
/**
 * Catalog Analytics Types
 * Types for tracking usage, metrics, and analytics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightSeverity = exports.InsightType = exports.TrendDirection = exports.TimePeriod = exports.UsageEventType = void 0;
/**
 * Usage Event Types
 */
var UsageEventType;
(function (UsageEventType) {
    UsageEventType["VIEW"] = "VIEW";
    UsageEventType["SEARCH"] = "SEARCH";
    UsageEventType["DOWNLOAD"] = "DOWNLOAD";
    UsageEventType["EDIT"] = "EDIT";
    UsageEventType["COMMENT"] = "COMMENT";
    UsageEventType["SHARE"] = "SHARE";
    UsageEventType["BOOKMARK"] = "BOOKMARK";
    UsageEventType["RATE"] = "RATE";
    UsageEventType["CERTIFY"] = "CERTIFY";
})(UsageEventType || (exports.UsageEventType = UsageEventType = {}));
/**
 * Time Period
 */
var TimePeriod;
(function (TimePeriod) {
    TimePeriod["DAY"] = "DAY";
    TimePeriod["WEEK"] = "WEEK";
    TimePeriod["MONTH"] = "MONTH";
    TimePeriod["QUARTER"] = "QUARTER";
    TimePeriod["YEAR"] = "YEAR";
})(TimePeriod || (exports.TimePeriod = TimePeriod = {}));
/**
 * Trend Direction
 */
var TrendDirection;
(function (TrendDirection) {
    TrendDirection["UP"] = "UP";
    TrendDirection["DOWN"] = "DOWN";
    TrendDirection["STABLE"] = "STABLE";
})(TrendDirection || (exports.TrendDirection = TrendDirection = {}));
/**
 * Insight Type
 */
var InsightType;
(function (InsightType) {
    InsightType["USAGE_SPIKE"] = "USAGE_SPIKE";
    InsightType["USAGE_DROP"] = "USAGE_DROP";
    InsightType["QUALITY_ISSUE"] = "QUALITY_ISSUE";
    InsightType["COVERAGE_GAP"] = "COVERAGE_GAP";
    InsightType["ADOPTION_TREND"] = "ADOPTION_TREND";
    InsightType["SEARCH_OPTIMIZATION"] = "SEARCH_OPTIMIZATION";
})(InsightType || (exports.InsightType = InsightType = {}));
/**
 * Insight Severity
 */
var InsightSeverity;
(function (InsightSeverity) {
    InsightSeverity["INFO"] = "INFO";
    InsightSeverity["LOW"] = "LOW";
    InsightSeverity["MEDIUM"] = "MEDIUM";
    InsightSeverity["HIGH"] = "HIGH";
    InsightSeverity["CRITICAL"] = "CRITICAL";
})(InsightSeverity || (exports.InsightSeverity = InsightSeverity = {}));
