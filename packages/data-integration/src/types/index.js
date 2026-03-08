"use strict";
/**
 * Core types for data integration framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineStatus = exports.LoadStrategy = exports.ExtractionStrategy = exports.SourceType = void 0;
var SourceType;
(function (SourceType) {
    SourceType["DATABASE"] = "database";
    SourceType["REST_API"] = "rest_api";
    SourceType["CLOUD_STORAGE"] = "cloud_storage";
    SourceType["SAAS"] = "saas";
    SourceType["SOCIAL_MEDIA"] = "social_media";
    SourceType["FINANCIAL_FEED"] = "financial_feed";
    SourceType["THREAT_INTEL"] = "threat_intel";
    SourceType["EMAIL"] = "email";
    SourceType["WEBHOOK"] = "webhook";
    SourceType["STREAM"] = "stream";
    SourceType["CUSTOM"] = "custom";
})(SourceType || (exports.SourceType = SourceType = {}));
var ExtractionStrategy;
(function (ExtractionStrategy) {
    ExtractionStrategy["FULL"] = "full";
    ExtractionStrategy["INCREMENTAL"] = "incremental";
    ExtractionStrategy["CDC"] = "cdc";
    ExtractionStrategy["SCHEDULED"] = "scheduled";
    ExtractionStrategy["REAL_TIME"] = "real_time";
    ExtractionStrategy["QUERY_BASED"] = "query_based";
    ExtractionStrategy["LOG_PARSING"] = "log_parsing";
    ExtractionStrategy["WEB_SCRAPING"] = "web_scraping";
})(ExtractionStrategy || (exports.ExtractionStrategy = ExtractionStrategy = {}));
var LoadStrategy;
(function (LoadStrategy) {
    LoadStrategy["BULK"] = "bulk";
    LoadStrategy["UPSERT"] = "upsert";
    LoadStrategy["SCD_TYPE1"] = "scd_type1";
    LoadStrategy["SCD_TYPE2"] = "scd_type2";
    LoadStrategy["SCD_TYPE3"] = "scd_type3";
    LoadStrategy["APPEND_ONLY"] = "append_only";
    LoadStrategy["DELTA"] = "delta";
    LoadStrategy["PARTITIONED"] = "partitioned";
})(LoadStrategy || (exports.LoadStrategy = LoadStrategy = {}));
var PipelineStatus;
(function (PipelineStatus) {
    PipelineStatus["PENDING"] = "pending";
    PipelineStatus["RUNNING"] = "running";
    PipelineStatus["SUCCESS"] = "success";
    PipelineStatus["FAILED"] = "failed";
    PipelineStatus["PARTIAL_SUCCESS"] = "partial_success";
    PipelineStatus["CANCELLED"] = "cancelled";
})(PipelineStatus || (exports.PipelineStatus = PipelineStatus = {}));
