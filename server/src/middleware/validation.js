"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
exports.validateRequestLegacy = validateRequestLegacy;
const zod_1 = require("zod");
/**
 * Zod-based request validation middleware
 * Validates params, body, and query against provided Zod schemas
 */
const validateRequest = (schemas) => {
    return async (req, res, next) => {
        try {
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedErrors = error.errors.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                return res.status(400).json({
                    error: 'Validation failed',
                    details: formattedErrors,
                });
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
/**
 * @deprecated Use validateRequest with Zod schemas instead
 */
function validateRequestLegacy(schema) {
    return (req, res, next) => {
        const body = req.body || {};
        for (const [key, rules] of Object.entries(schema)) {
            if (rules.required &&
                (body[key] === undefined || body[key] === null || body[key] === '')) {
                return res
                    .status(400)
                    .json({ error: `Missing required field: ${key}` });
            }
            if (typeof body[key] === 'string') {
                if (rules.minLength && body[key].length < rules.minLength) {
                    return res.status(400).json({
                        error: `${key} must be at least ${rules.minLength} characters`,
                    });
                }
                if (rules.maxLength && body[key].length > rules.maxLength) {
                    return res.status(400).json({
                        error: `${key} must be at most ${rules.maxLength} characters`,
                    });
                }
                if (rules.format === 'uri') {
                    try {
                        new URL(body[key]);
                    }
                    catch {
                        return res
                            .status(400)
                            .json({ error: `${key} must be a valid URI` });
                    }
                }
                if (rules.pattern) {
                    const re = new RegExp(rules.pattern);
                    if (!re.test(body[key]))
                        return res.status(400).json({ error: `${key} invalid format` });
                }
            }
        }
        next();
    };
}
