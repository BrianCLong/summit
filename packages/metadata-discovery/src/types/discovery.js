"use strict";
/**
 * Metadata Discovery Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternType = exports.ErrorSeverity = exports.JobStatus = exports.DataSourceType = void 0;
/**
 * Data Source Types
 */
var DataSourceType;
(function (DataSourceType) {
    DataSourceType["POSTGRESQL"] = "POSTGRESQL";
    DataSourceType["MYSQL"] = "MYSQL";
    DataSourceType["MONGODB"] = "MONGODB";
    DataSourceType["NEO4J"] = "NEO4J";
    DataSourceType["S3"] = "S3";
    DataSourceType["HDFS"] = "HDFS";
    DataSourceType["API"] = "API";
    DataSourceType["FILE_SYSTEM"] = "FILE_SYSTEM";
    DataSourceType["SNOWFLAKE"] = "SNOWFLAKE";
    DataSourceType["BIGQUERY"] = "BIGQUERY";
    DataSourceType["REDSHIFT"] = "REDSHIFT";
})(DataSourceType || (exports.DataSourceType = DataSourceType = {}));
/**
 * Job Status
 */
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "PENDING";
    JobStatus["RUNNING"] = "RUNNING";
    JobStatus["COMPLETED"] = "COMPLETED";
    JobStatus["FAILED"] = "FAILED";
    JobStatus["CANCELLED"] = "CANCELLED";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
/**
 * Error Severity
 */
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["INFO"] = "INFO";
    ErrorSeverity["WARNING"] = "WARNING";
    ErrorSeverity["ERROR"] = "ERROR";
    ErrorSeverity["CRITICAL"] = "CRITICAL";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
/**
 * Pattern Types
 */
var PatternType;
(function (PatternType) {
    PatternType["EMAIL"] = "EMAIL";
    PatternType["PHONE"] = "PHONE";
    PatternType["URL"] = "URL";
    PatternType["IP_ADDRESS"] = "IP_ADDRESS";
    PatternType["DATE"] = "DATE";
    PatternType["CURRENCY"] = "CURRENCY";
    PatternType["SSN"] = "SSN";
    PatternType["CREDIT_CARD"] = "CREDIT_CARD";
    PatternType["CUSTOM"] = "CUSTOM";
})(PatternType || (exports.PatternType = PatternType = {}));
