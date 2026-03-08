"use strict";
/**
 * Validation Middleware
 *
 * Validates request data against JSON schemas
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const error_handler_js_1 = require("./error-handler.js");
const ajv = new ajv_1.default({
    allErrors: true,
    removeAdditional: true,
    coerceTypes: true,
    useDefaults: true,
});
(0, ajv_formats_1.default)(ajv);
/**
 * Validate request data
 */
function validate(schemas) {
    return (req, res, next) => {
        req.validated = {};
        try {
            // Validate body
            if (schemas.body) {
                const validate = ajv.compile(schemas.body);
                const valid = validate(req.body);
                if (!valid) {
                    throw new error_handler_js_1.ValidationException('Request body validation failed', {
                        errors: validate.errors,
                    });
                }
                req.validated.body = req.body;
            }
            // Validate query
            if (schemas.query) {
                const validate = ajv.compile(schemas.query);
                const valid = validate(req.query);
                if (!valid) {
                    throw new error_handler_js_1.ValidationException('Query parameters validation failed', {
                        errors: validate.errors,
                    });
                }
                req.validated.query = req.query;
            }
            // Validate params
            if (schemas.params) {
                const validate = ajv.compile(schemas.params);
                const valid = validate(req.params);
                if (!valid) {
                    throw new error_handler_js_1.ValidationException('Path parameters validation failed', {
                        errors: validate.errors,
                    });
                }
                req.validated.params = req.params;
            }
            // Validate headers
            if (schemas.headers) {
                const validate = ajv.compile(schemas.headers);
                const valid = validate(req.headers);
                if (!valid) {
                    throw new error_handler_js_1.ValidationException('Headers validation failed', {
                        errors: validate.errors,
                    });
                }
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
