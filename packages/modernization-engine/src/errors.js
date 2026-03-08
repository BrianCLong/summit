"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoundaryViolationError = exports.ValidationError = void 0;
class ValidationError extends Error {
}
exports.ValidationError = ValidationError;
class BoundaryViolationError extends Error {
}
exports.BoundaryViolationError = BoundaryViolationError;
