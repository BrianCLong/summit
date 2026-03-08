"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleValidationError = void 0;
class BundleValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BundleValidationError';
    }
}
exports.BundleValidationError = BundleValidationError;
