"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationError = exports.TranslationErrorCode = void 0;
/**
 * Translation error types
 */
var TranslationErrorCode;
(function (TranslationErrorCode) {
    TranslationErrorCode["POLICY_VIOLATION"] = "POLICY_VIOLATION";
    TranslationErrorCode["LANGUAGE_NOT_SUPPORTED"] = "LANGUAGE_NOT_SUPPORTED";
    TranslationErrorCode["TEXT_TOO_LONG"] = "TEXT_TOO_LONG";
    TranslationErrorCode["DETECTION_FAILED"] = "DETECTION_FAILED";
    TranslationErrorCode["TRANSLATION_FAILED"] = "TRANSLATION_FAILED";
    TranslationErrorCode["PROVIDER_ERROR"] = "PROVIDER_ERROR";
    TranslationErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
})(TranslationErrorCode || (exports.TranslationErrorCode = TranslationErrorCode = {}));
/**
 * Translation error
 */
class TranslationError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'TranslationError';
    }
}
exports.TranslationError = TranslationError;
