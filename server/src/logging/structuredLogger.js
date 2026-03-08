"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopLogAggregation = exports.auditLogDashboard = exports.appLogger = exports.alertEngine = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pino_1 = __importDefault(require("pino"));
const logEventBus_js_1 = require("./logEventBus.js");
const logAlertEngine_js_1 = require("./logAlertEngine.js");
const logRetention_js_1 = require("./logRetention.js");
const logEventFormatter_js_1 = require("./logEventFormatter.js");
const logRedaction_js_1 = require("./logRedaction.js");
const auditLogPipeline_js_1 = require("./auditLogPipeline.js");
const ledger_js_1 = require("../audit/ledger.js");
const logDir = process.env.LOG_DIR || path_1.default.join(process.cwd(), 'logs');
const logFile = path_1.default.join(logDir, 'app-structured.log');
const errorFile = path_1.default.join(logDir, 'app-error.log');
fs_1.default.mkdirSync(logDir, { recursive: true });
const transport = pino_1.default.transport({
    targets: [
        {
            level: process.env.LOG_LEVEL || 'info',
            target: 'pino/file',
            options: { destination: logFile, mkdir: true },
        },
        {
            level: 'error',
            target: 'pino/file',
            options: { destination: errorFile, mkdir: true },
        },
        {
            level: process.env.LOG_LEVEL || 'info',
            target: 'pino/file',
            options: { destination: 1 },
        },
    ],
});
const baseLogger = pino_1.default({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        service: process.env.SERVICE_NAME || 'summit-api',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version,
        hostname: process.env.HOSTNAME,
    },
    redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'ssn', 'card.number'],
    timestamp: pino_1.default.stdTimeFunctions?.isoTime || (() => `,"time":"${new Date().toISOString()}"`),
    hooks: {
        logMethod(args, method, level) {
            const safeArgs = (0, logRedaction_js_1.sanitizeLogArguments)(args);
            try {
                const event = (0, logEventFormatter_js_1.formatLogEvent)(level || 'info', safeArgs);
                logEventBus_js_1.logEventBus.publish(event);
            }
            catch (error) {
                // Guard against serialization errors without breaking application logging.
                baseLogger.warn({ error }, 'Failed to mirror log event to bus');
            }
            method.apply(this, safeArgs);
        },
    },
}, transport);
exports.alertEngine = new logAlertEngine_js_1.LogAlertEngine([...logAlertEngine_js_1.defaultAlertRules]);
const detachAlertEngine = exports.alertEngine.attach(logEventBus_js_1.logEventBus);
const retentionPolicy = {
    directory: logDir,
    retentionDays: Number(process.env.LOG_RETENTION_DAYS ?? '30'),
    compressAfterDays: Number(process.env.LOG_COMPRESS_AFTER_DAYS ?? '3'),
    maxTotalSizeMb: Number(process.env.LOG_TOTAL_SIZE_MB ?? '2048'),
};
const stopRetention = (0, logRetention_js_1.scheduleRetention)(retentionPolicy, baseLogger);
const auditPipeline = new auditLogPipeline_js_1.AuditLogPipeline({
    logDir: process.env.AUDIT_LOG_DIR || path_1.default.join(logDir, 'audit'),
    streamName: process.env.AUDIT_LOG_STREAM || 'audit-log',
    alertEngine: exports.alertEngine,
    logger: baseLogger.child({ component: 'audit-log-pipeline' }),
    retentionPolicy: {
        directory: process.env.AUDIT_LOG_DIR || path_1.default.join(logDir, 'audit'),
        retentionDays: Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? '365'),
        compressAfterDays: Number(process.env.AUDIT_LOG_COMPRESS_AFTER_DAYS ?? '7'),
        maxTotalSizeMb: Number(process.env.AUDIT_LOG_TOTAL_SIZE_MB ?? '4096'),
    },
});
const auditChainEnabled = process.env.AUDIT_CHAIN === 'true';
const auditLedger = auditChainEnabled
    ? new ledger_js_1.AuditLedger({
        ledgerFilePath: process.env.AUDIT_LEDGER_FILE,
        logger: baseLogger.child({ component: 'audit-ledger' }),
    })
    : null;
exports.appLogger = baseLogger;
exports.auditLogDashboard = auditPipeline;
const stopLogAggregation = () => {
    detachAlertEngine();
    stopRetention();
    auditPipeline.stop();
    auditLedger?.stop();
    logEventBus_js_1.logEventBus.reset();
};
exports.stopLogAggregation = stopLogAggregation;
