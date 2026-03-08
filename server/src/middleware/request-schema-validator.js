"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRequestValidator = buildRequestValidator;
exports.createSqlInjectionGuard = createSqlInjectionGuard;
const index_js_1 = require("../validation/index.js");
function formatJoiErrors(error) {
    return error.details.map((detail) => detail.message);
}
function formatZodErrors(error) {
    return error.errors.map((err) => `${err.path.join('.') || 'value'}: ${err.message}`);
}
function buildRequestValidator({ zodSchema, joiSchema, target = 'body', allowUnknown = false, }) {
    return (req, res, next) => {
        try {
            const payload = req[target] ?? {};
            let validated = payload;
            if (joiSchema) {
                const { error, value } = joiSchema.validate(payload, {
                    abortEarly: false,
                    stripUnknown: !allowUnknown,
                    convert: true,
                });
                if (error) {
                    res.status(400).json({
                        error: 'Validation failed',
                        details: formatJoiErrors(error),
                    });
                    return;
                }
                validated = value;
            }
            if (zodSchema) {
                const result = zodSchema.safeParse(validated);
                if (!result.success) {
                    res.status(400).json({
                        error: 'Validation failed',
                        details: formatZodErrors(result.error),
                    });
                    return;
                }
                validated = result.data;
            }
            const sanitized = index_js_1.SanitizationUtils.sanitizeUserInput(validated);
            const guardResult = index_js_1.SecurityValidator.validateInput(sanitized);
            if (!guardResult.valid) {
                res.status(400).json({
                    error: 'Request rejected for security reasons',
                    details: guardResult.errors,
                });
                return;
            }
            req[target] = sanitized;
            next();
        }
        catch (error) {
            res.status(500).json({ error: 'Request validation failed unexpectedly' });
        }
    };
}
function createSqlInjectionGuard() {
    return (req, res, next) => {
        const payloadSnapshot = {
            body: req.body,
            query: req.query,
            params: req.params,
        };
        const result = index_js_1.SecurityValidator.validateInput(payloadSnapshot);
        if (!result.valid) {
            res.status(400).json({
                error: 'Suspicious input detected',
                details: result.errors,
            });
            return;
        }
        next();
    };
}
