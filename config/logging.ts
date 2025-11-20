/**
 * Logging configuration with rotation and retention policies
 * Supports multiple transports, log rotation, and environment-specific settings
 */
import path from 'path';
import { LoggerConfig, LogLevel } from '@intelgraph/logger';

/**
 * Environment-based log level configuration
 */
export function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();

  switch (level) {
    case 'fatal':
    case 'error':
    case 'warn':
    case 'info':
    case 'debug':
    case 'trace':
      return level as LogLevel;
    default:
      // Default based on environment
      return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  }
}

/**
 * Get log file path based on environment
 */
export function getLogPath(): string {
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  const logFile = process.env.LOG_FILE || 'application.log';
  return path.join(logDir, logFile);
}

/**
 * Get audit log file path
 */
export function getAuditLogPath(): string {
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  const logFile = process.env.AUDIT_LOG_FILE || 'audit.log';
  return path.join(logDir, logFile);
}

/**
 * Log rotation configuration
 * Compatible with pino-rotating-file-stream and similar transports
 */
export interface LogRotationConfig {
  /**
   * Maximum size per log file (e.g., '10M', '100K')
   * Default: '10M'
   */
  maxSize: string;

  /**
   * Maximum number of rotated files to keep
   * Default: 10
   */
  maxFiles: number;

  /**
   * Whether to compress rotated files
   * Default: true
   */
  compress: boolean;

  /**
   * Rotation interval (e.g., '1d' for daily, '1h' for hourly)
   * Default: '1d'
   */
  interval?: string;

  /**
   * Date pattern for rotated files
   * Default: 'YYYY-MM-DD'
   */
  datePattern?: string;
}

/**
 * Log retention policy configuration
 */
export interface LogRetentionConfig {
  /**
   * Number of days to retain application logs
   * Default: 30
   */
  applicationLogDays: number;

  /**
   * Number of days to retain audit logs
   * Default: 90 (compliance requirement)
   */
  auditLogDays: number;

  /**
   * Number of days to retain error logs
   * Default: 60
   */
  errorLogDays: number;

  /**
   * Whether to archive old logs before deletion
   * Default: true
   */
  archiveBeforeDelete: boolean;

  /**
   * Archive destination (e.g., S3 bucket, file path)
   */
  archiveDestination?: string;
}

/**
 * Default log rotation configuration
 */
export const DEFAULT_LOG_ROTATION: LogRotationConfig = {
  maxSize: process.env.LOG_MAX_SIZE || '10M',
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '10', 10),
  compress: process.env.LOG_COMPRESS !== 'false',
  interval: process.env.LOG_ROTATION_INTERVAL || '1d',
  datePattern: 'YYYY-MM-DD',
};

/**
 * Default log retention configuration
 */
export const DEFAULT_LOG_RETENTION: LogRetentionConfig = {
  applicationLogDays: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),
  auditLogDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10),
  errorLogDays: parseInt(process.env.ERROR_LOG_RETENTION_DAYS || '60', 10),
  archiveBeforeDelete: process.env.LOG_ARCHIVE_BEFORE_DELETE !== 'false',
  archiveDestination: process.env.LOG_ARCHIVE_DESTINATION,
};

/**
 * Application logger configuration
 */
export const applicationLoggerConfig: LoggerConfig = {
  level: getLogLevel(),
  pretty: process.env.NODE_ENV === 'development',
  service: process.env.SERVICE_NAME || 'intelgraph',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '1.0.0',
  rotation: DEFAULT_LOG_ROTATION,
};

/**
 * Audit logger configuration
 * Always uses info level and stores separately for compliance
 */
export const auditLoggerConfig: LoggerConfig = {
  level: 'info',
  pretty: false, // Always structured for audit logs
  service: 'audit',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '1.0.0',
  rotation: {
    ...DEFAULT_LOG_ROTATION,
    maxFiles: 30, // Keep more audit logs
  },
};

/**
 * ELK Stack / Log Aggregation Configuration
 * For shipping logs to Elasticsearch, Logstash, or similar
 */
export interface LogAggregationConfig {
  /**
   * Whether log aggregation is enabled
   */
  enabled: boolean;

  /**
   * Aggregation service type
   */
  service: 'elasticsearch' | 'logstash' | 'cloudwatch' | 'datadog' | 'custom';

  /**
   * Elasticsearch configuration
   */
  elasticsearch?: {
    node: string;
    index: string;
    auth?: {
      username: string;
      password: string;
    };
  };

  /**
   * Logstash configuration
   */
  logstash?: {
    host: string;
    port: number;
    protocol: 'tcp' | 'udp';
  };

  /**
   * CloudWatch configuration
   */
  cloudwatch?: {
    logGroupName: string;
    logStreamName: string;
    region: string;
  };

  /**
   * Custom transport configuration
   */
  custom?: {
    url: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
  };
}

/**
 * Log aggregation configuration from environment
 */
export const logAggregationConfig: LogAggregationConfig = {
  enabled: process.env.LOG_AGGREGATION_ENABLED === 'true',
  service: (process.env.LOG_AGGREGATION_SERVICE as any) || 'elasticsearch',

  elasticsearch: process.env.ELASTICSEARCH_NODE
    ? {
        node: process.env.ELASTICSEARCH_NODE,
        index: process.env.ELASTICSEARCH_INDEX || 'intelgraph-logs',
        auth: process.env.ELASTICSEARCH_USERNAME
          ? {
              username: process.env.ELASTICSEARCH_USERNAME,
              password: process.env.ELASTICSEARCH_PASSWORD || '',
            }
          : undefined,
      }
    : undefined,

  logstash: process.env.LOGSTASH_HOST
    ? {
        host: process.env.LOGSTASH_HOST,
        port: parseInt(process.env.LOGSTASH_PORT || '5000', 10),
        protocol: (process.env.LOGSTASH_PROTOCOL as any) || 'tcp',
      }
    : undefined,

  cloudwatch: process.env.CLOUDWATCH_LOG_GROUP
    ? {
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP,
        logStreamName:
          process.env.CLOUDWATCH_LOG_STREAM || 'intelgraph-stream',
        region: process.env.AWS_REGION || 'us-east-1',
      }
    : undefined,

  custom: process.env.LOG_AGGREGATION_URL
    ? {
        url: process.env.LOG_AGGREGATION_URL,
        method: (process.env.LOG_AGGREGATION_METHOD as any) || 'POST',
      }
    : undefined,
};

/**
 * Complete logging configuration
 */
export const loggingConfig = {
  application: applicationLoggerConfig,
  audit: auditLoggerConfig,
  rotation: DEFAULT_LOG_ROTATION,
  retention: DEFAULT_LOG_RETENTION,
  aggregation: logAggregationConfig,
};

export default loggingConfig;
