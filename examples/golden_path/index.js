"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../server/src/feature_flags/index.js");
const redaction_js_1 = require("../../server/src/observability/logging/redaction.js");
class ConsoleLogger {
    info(message, meta) { console.log(`INFO: ${message}`, meta); }
    error(message, error, meta) { console.error(`ERROR: ${message}`, error, meta); }
    warn(message, meta) { console.warn(`WARN: ${message}`, meta); }
    debug(message, meta) { console.debug(`DEBUG: ${message}`, meta); }
}
async function main() {
    console.log('🌟 Running Golden Path Example 🌟');
    // 1. Logging & Redaction
    const logger = new ConsoleLogger();
    const sensitiveData = { user: 'alice', password: 'secretpassword' };
    logger.info('Sanitized data:', (0, redaction_js_1.redact)(sensitiveData));
    // 2. Feature Flags
    if ((0, index_js_1.isEnabled)(index_js_1.FeatureFlags.NEW_SEARCH_ALGORITHM)) {
        logger.info('New Search Algorithm is ENABLED');
    }
    else {
        logger.info('New Search Algorithm is DISABLED (default)');
    }
}
main().catch(console.error);
