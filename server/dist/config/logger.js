import pino from 'pino';
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    browser: {
        asObject: true,
    },
    // Remove pino-pretty transport for production readiness
    // In production, logs should be structured JSON for log aggregation
});
export default logger;
//# sourceMappingURL=logger.js.map