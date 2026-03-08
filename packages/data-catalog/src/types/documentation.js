"use strict";
/**
 * Collaborative Documentation Types
 * Types for rich documentation, comments, and collaborative editing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditOperationType = exports.ReactionType = exports.DocumentStatus = exports.DocumentFormat = void 0;
/**
 * Document Format
 */
var DocumentFormat;
(function (DocumentFormat) {
    DocumentFormat["MARKDOWN"] = "MARKDOWN";
    DocumentFormat["HTML"] = "HTML";
    DocumentFormat["RICH_TEXT"] = "RICH_TEXT";
    DocumentFormat["PLAIN_TEXT"] = "PLAIN_TEXT";
})(DocumentFormat || (exports.DocumentFormat = DocumentFormat = {}));
/**
 * Document Status
 */
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["DRAFT"] = "DRAFT";
    DocumentStatus["REVIEW"] = "REVIEW";
    DocumentStatus["PUBLISHED"] = "PUBLISHED";
    DocumentStatus["ARCHIVED"] = "ARCHIVED";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
/**
 * Reaction Types
 */
var ReactionType;
(function (ReactionType) {
    ReactionType["LIKE"] = "LIKE";
    ReactionType["LOVE"] = "LOVE";
    ReactionType["THUMBS_UP"] = "THUMBS_UP";
    ReactionType["THUMBS_DOWN"] = "THUMBS_DOWN";
    ReactionType["CELEBRATE"] = "CELEBRATE";
    ReactionType["INSIGHTFUL"] = "INSIGHTFUL";
})(ReactionType || (exports.ReactionType = ReactionType = {}));
/**
 * Edit Operation Type
 */
var EditOperationType;
(function (EditOperationType) {
    EditOperationType["INSERT"] = "INSERT";
    EditOperationType["DELETE"] = "DELETE";
    EditOperationType["REPLACE"] = "REPLACE";
    EditOperationType["FORMAT"] = "FORMAT";
})(EditOperationType || (exports.EditOperationType = EditOperationType = {}));
