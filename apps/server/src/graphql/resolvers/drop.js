"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dropResolvers = void 0;
const uuid_1 = require("uuid");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const validation_js_1 = require("../../security/validation.js");
const securityLogger_js_1 = require("../../observability/securityLogger.js");
const QUARANTINE_DIR = process.env.QUARANTINE_DIR || path_1.default.join(process.cwd(), 'quarantine');
const KPW_MEDIA_URL = process.env.KPW_MEDIA_URL || 'http://localhost:7102';
const LAC_URL = process.env.LAC_URL || 'http://localhost:7103'; // Assuming LAC has an API
// Ensure quarantine directory exists
promises_1.default.mkdir(QUARANTINE_DIR, { recursive: true }).catch(console.error);
exports.dropResolvers = {
    Query: {
        health: () => 'ok',
    },
    Mutation: {
        submitDrop: async (_, { input }) => {
            const dropId = (0, uuid_1.v4)();
            const quarantinePath = path_1.default.join(QUARANTINE_DIR, `${dropId}.drop`);
            try {
                const sanitized = (0, validation_js_1.validateAndSanitizeDropInput)(input);
                // 1. Store raw payload in quarantine
                await promises_1.default.writeFile(quarantinePath, sanitized.payload);
                let status = 'QUARANTINED';
                let reason = 'Stored in quarantine, awaiting verification.';
                // 2. Simulate KPW-Media verification
                // In a real scenario, the payload would be processed to generate step commits
                // and then sent to KPW-Media for wallet building/verification.
                // For MVP, we simulate a verification call.
                const kpwVerifyResult = await axios_1.default
                    .post(`${KPW_MEDIA_URL}/kpw/verify`, { bundle: {} }) // Placeholder bundle
                    .then((res) => res.data.ok)
                    .catch(() => false);
                if (!kpwVerifyResult) {
                    reason = 'KPW-Media verification failed or not applicable.';
                }
                // 3. Simulate LAC evaluation
                // This would involve compiling a policy and evaluating it against the drop's context.
                const lacEvalResult = await axios_1.default
                    .post(`${LAC_URL}/lac/evaluate`, { context: {}, policy: {} }) // Placeholder context/policy
                    .then((res) => res.data.allow)
                    .catch(() => false);
                if (!lacEvalResult) {
                    reason =
                        reason === 'Stored in quarantine, awaiting verification.'
                            ? 'LAC policy denied.'
                            : reason + ' LAC policy denied.';
                }
                if (kpwVerifyResult && lacEvalResult) {
                    status = 'VERIFIED';
                    reason = 'KPW-Media verified and LAC policy allowed.';
                }
                else if (!kpwVerifyResult || !lacEvalResult) {
                    status = 'DENIED';
                    // Reason already set based on failures
                }
                securityLogger_js_1.securityLogger.logEvent('drop_submission', {
                    level: 'info',
                    id: dropId,
                    status,
                    metadataKeys: sanitized.metadata ? Object.keys(sanitized.metadata) : [],
                });
                return { id: dropId, status, reason };
            }
            catch (error) {
                securityLogger_js_1.securityLogger.logEvent('drop_submission', {
                    level: 'error',
                    id: dropId,
                    message: error?.message,
                });
                return {
                    id: dropId,
                    status: 'QUARANTINED',
                    reason: `Processing error: ${error.message}`,
                };
            }
        },
    },
};
