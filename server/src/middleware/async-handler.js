"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
/**
 * A wrapper for async route handlers to catch errors and pass them to the next middleware.
 * This avoids the need for a try-catch block in every async route handler.
 *
 * @param fn - The async route handler function.
 * @returns An Express RequestHandler function.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
