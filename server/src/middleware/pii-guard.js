"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.piiGuardMiddleware = exports.createPiiGuardMiddleware = void 0;
const recognizer_js_1 = require("../pii/recognizer.js");
const redact_js_1 = require("../redaction/redact.js");
const logger_js_1 = require("../config/logger.js");
const recognizer = new recognizer_js_1.HybridEntityRecognizer();
const buildTenantId = (req) => {
    const candidate = req.tenant?.id ||
        req.tenant_id ||
        req.user?.tenant_id ||
        req.headers['x-tenant-id'] ||
        'public';
    return typeof candidate === 'string' ? candidate : String(candidate);
};
const flattenStrings = (value, path = [], results = []) => {
    if (value === null || value === undefined)
        return results;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        results.push({ path: path.join('.'), value: String(value) });
        return results;
    }
    if (Array.isArray(value)) {
        value.forEach((entry, idx) => {
            flattenStrings(entry, [...path, String(idx)], results);
        });
        return results;
    }
    if (typeof value === 'object') {
        Object.entries(value).forEach(([key, nested]) => {
            flattenStrings(nested, [...path, key], results);
        });
    }
    return results;
};
const summarizePayload = (payload, maximumPreviewBytes) => {
    if (payload === undefined)
        return undefined;
    const serialized = JSON.stringify(payload);
    if (!serialized)
        return undefined;
    if (serialized.length <= maximumPreviewBytes)
        return serialized;
    return `${serialized.slice(0, maximumPreviewBytes)}…[truncated]`;
};
const redactPayloadForLogging = async (payload, tenantId) => {
    if (!payload || typeof payload !== 'object')
        return undefined;
    try {
        const policy = redact_js_1.redactionService.createRedactionPolicy(['pii', 'financial', 'sensitive']);
        return await redact_js_1.redactionService.redactObject(payload, policy, tenantId, { source: 'pii-guard' });
    }
    catch (error) {
        logger_js_1.logger.warn({ err: error }, 'PII guard redaction failed; continuing without payload preview');
        return undefined;
    }
};
const detectPii = async (payload, minimumConfidence) => {
    const targets = flattenStrings(payload, ['body']);
    const findings = [];
    for (const target of targets) {
        if (!target.value)
            continue;
        const result = await recognizer.recognize({
            value: target.value,
            recordId: target.path,
        });
        result.entities
            .filter((entity) => entity.confidence >= minimumConfidence)
            .forEach((entity) => {
            findings.push({
                path: target.path,
                type: entity.type,
                confidence: entity.confidence,
                detector: entity.detectors?.[0] ?? 'pattern',
            });
        });
    }
    return findings;
};
const createPiiGuardMiddleware = (options = {}) => {
    const logger = options.logger ?? logger_js_1.logger.child({ module: 'pii-guard' });
    const maximumPreviewBytes = options.maximumPreviewBytes ?? 512;
    const minimumConfidence = options.minimumConfidence ?? 0.6;
    return async (req, res, next) => {
        const tenantId = buildTenantId(req);
        const piiFindings = await detectPii(req.body, minimumConfidence);
        const redactedRequest = await redactPayloadForLogging(req.body, tenantId);
        const captureResponseRedaction = async (payload) => {
            const redactedResponse = await redactPayloadForLogging(payload, tenantId);
            if (redactedResponse !== undefined) {
                res.locals.piiGuardRedactedResponse = redactedResponse;
            }
        };
        const originalJson = res.json.bind(res);
        res.json = ((body) => {
            void captureResponseRedaction(body);
            return originalJson(body);
        });
        const originalSend = res.send.bind(res);
        res.send = ((body) => {
            void captureResponseRedaction(body);
            return originalSend(body);
        });
        res.on('finish', () => {
            const redactedResponse = res.locals.piiGuardRedactedResponse;
            const summary = {
                requestFindings: piiFindings.map((finding) => ({
                    path: finding.path,
                    type: finding.type,
                    confidence: Number(finding.confidence.toFixed(2)),
                    detector: finding.detector,
                })),
                redactedRequestPreview: summarizePayload(redactedRequest, maximumPreviewBytes),
                redactedResponsePreview: summarizePayload(redactedResponse, maximumPreviewBytes),
                tenantId,
            };
            logger.info({ piiScan: summary }, 'PII guard redaction applied to HTTP exchange');
        });
        return next();
    };
};
exports.createPiiGuardMiddleware = createPiiGuardMiddleware;
exports.piiGuardMiddleware = (0, exports.createPiiGuardMiddleware)();
exports.default = exports.piiGuardMiddleware;
