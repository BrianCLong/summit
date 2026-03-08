"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelCardValidationError = void 0;
class ModelCardValidationError extends Error {
    issues;
    constructor(issues) {
        super(`Model card validation failed with ${issues.length} issue(s).`);
        this.name = 'ModelCardValidationError';
        this.issues = issues;
    }
}
exports.ModelCardValidationError = ModelCardValidationError;
