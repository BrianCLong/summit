"use strict";
/**
 * Logger utility for Admin CLI
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.configureLogger = configureLogger;
exports.setLogLevel = setLogLevel;
exports.setVerbose = setVerbose;
exports.setJsonOutput = setJsonOutput;
exports.error = error;
exports.warn = warn;
exports.info = info;
exports.verbose = verbose;
exports.debug = debug;
exports.createLogger = createLogger;
const chalk_1 = __importDefault(require("chalk"));
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    verbose: 3,
    debug: 4,
};
let config = {
    level: 'info',
    timestamps: false,
    jsonOutput: false,
};
/**
 * Configure logger
 */
function configureLogger(options) {
    config = { ...config, ...options };
}
/**
 * Set log level
 */
function setLogLevel(level) {
    config.level = level;
}
/**
 * Enable verbose mode
 */
function setVerbose(verbose) {
    if (verbose) {
        config.level = 'verbose';
    }
}
/**
 * Enable JSON output
 */
function setJsonOutput(json) {
    config.jsonOutput = json;
}
function shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[config.level];
}
function formatMessage(level, message, data) {
    if (config.jsonOutput) {
        return JSON.stringify({
            level,
            message,
            timestamp: new Date().toISOString(),
            ...(data && { data }),
        });
    }
    const timestamp = config.timestamps ? chalk_1.default.gray(`[${new Date().toISOString()}] `) : '';
    const levelColors = {
        error: chalk_1.default.red,
        warn: chalk_1.default.yellow,
        info: chalk_1.default.blue,
        verbose: chalk_1.default.cyan,
        debug: chalk_1.default.gray,
    };
    const coloredLevel = levelColors[level](`[${level.toUpperCase()}]`);
    const dataStr = data ? ` ${chalk_1.default.gray(JSON.stringify(data))}` : '';
    return `${timestamp}${coloredLevel} ${message}${dataStr}`;
}
/**
 * Log error message
 */
function error(message, data) {
    if (shouldLog('error')) {
        console.error(formatMessage('error', message, data));
    }
}
/**
 * Log warning message
 */
function warn(message, data) {
    if (shouldLog('warn')) {
        console.warn(formatMessage('warn', message, data));
    }
}
/**
 * Log info message
 */
function info(message, data) {
    if (shouldLog('info')) {
        console.log(formatMessage('info', message, data));
    }
}
/**
 * Log verbose message
 */
function verbose(message, data) {
    if (shouldLog('verbose')) {
        console.log(formatMessage('verbose', message, data));
    }
}
/**
 * Log debug message
 */
function debug(message, data) {
    if (shouldLog('debug')) {
        console.log(formatMessage('debug', message, data));
    }
}
/**
 * Create logger instance implementing LoggerInterface
 */
function createLogger() {
    return {
        info,
        warn,
        error,
        debug,
        verbose,
    };
}
exports.logger = createLogger();
