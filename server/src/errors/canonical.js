"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanonicalError = void 0;
const ErrorHandlingFramework_js_1 = require("./ErrorHandlingFramework.js");
const catalog_js_1 = require("./catalog.js");
class CanonicalError extends ErrorHandlingFramework_js_1.AppError {
    remediation;
    constructor(key, details) {
        const def = catalog_js_1.MasterErrorCatalog[key];
        let category = ErrorHandlingFramework_js_1.ErrorCategory.OPERATIONAL;
        if (def.category === 'System')
            category = ErrorHandlingFramework_js_1.ErrorCategory.PROGRAMMING;
        if (def.category === 'Security')
            category = ErrorHandlingFramework_js_1.ErrorCategory.SECURITY;
        super(def.message, def.code, {
            statusCode: def.status,
            category,
            severity: def.status >= 500 ? ErrorHandlingFramework_js_1.ErrorSeverity.ERROR : ErrorHandlingFramework_js_1.ErrorSeverity.WARN,
            context: { metadata: details }
        });
        this.remediation = def.remediation;
    }
    toJSON() {
        return {
            ...super.toJSON(),
            remediation: this.remediation
        };
    }
}
exports.CanonicalError = CanonicalError;
