"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_client_js_1 = require("../../src/utils/http-client.js");
const logger_js_1 = require("../../src/config/logger.js");
/**
 * Task #110: PQC Operational Readiness Drill.
 * Validates that PQC Identity headers are automatically attached to internal traffic.
 */
async function runPQCOperationalDrill() {
    logger_js_1.logger.info('🚀 Starting PQC Operational Readiness Drill');
    const client = (0, http_client_js_1.createSafeClient)();
    console.log('--- Step 1: Simulating Internal Service Call ---');
    // We don't actually need to make the call, just check the interceptor logic
    // by inspecting a request config.
    // We can't easily inspect axios internal state without a mock adapter,
    // so we'll just test the createSafeClient with a known internal URL.
    const internalUrl = 'http://summit-server:4000/api/internal/status';
    console.log('Target URL: ' + internalUrl);
    // We'll use a hacky way to test the interceptor by providing a mock config to its handler
    // @ts-ignore
    const pqcInterceptor = client.interceptors.request.handlers[1]; // The second one we added
    const mockConfig = {
        url: internalUrl,
        headers: {}
    };
    console.log('Executing PQC Interceptor...');
    const resultConfig = await pqcInterceptor.fulfilled(mockConfig);
    const pqcHeader = resultConfig.headers['X-Summit-PQC-Identity'];
    if (pqcHeader) {
        console.log('✅ PQC Identity Header Found!');
        const identity = JSON.parse(pqcHeader);
        console.log('Service ID: ' + identity.serviceId);
        console.log('Algorithm: ' + identity.algorithm);
        if (identity.algorithm === 'KYBER-768' && identity.signature.startsWith('pqc-sig:')) {
            logger_js_1.logger.info('✅ PQC Operational Drill Passed');
            process.exit(0);
        }
    }
    logger_js_1.logger.error('❌ PQC Identity Header missing or invalid');
    process.exit(1);
}
runPQCOperationalDrill().catch(err => {
    console.error('❌ Drill Failed:', err);
    process.exit(1);
});
