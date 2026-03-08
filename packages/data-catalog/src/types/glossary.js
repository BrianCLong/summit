"use strict";
/**
 * Business Glossary Types
 * Types for managing business terminology and data dictionaries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalAction = exports.RuleSeverity = exports.BusinessRuleType = exports.ApprovalStatus = exports.TermStatus = void 0;
/**
 * Term Status
 */
var TermStatus;
(function (TermStatus) {
    TermStatus["DRAFT"] = "DRAFT";
    TermStatus["PUBLISHED"] = "PUBLISHED";
    TermStatus["DEPRECATED"] = "DEPRECATED";
    TermStatus["ARCHIVED"] = "ARCHIVED";
})(TermStatus || (exports.TermStatus = TermStatus = {}));
/**
 * Approval Status
 */
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "PENDING";
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["REJECTED"] = "REJECTED";
    ApprovalStatus["CHANGES_REQUESTED"] = "CHANGES_REQUESTED";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
/**
 * Business Rule Type
 */
var BusinessRuleType;
(function (BusinessRuleType) {
    BusinessRuleType["VALIDATION"] = "VALIDATION";
    BusinessRuleType["CALCULATION"] = "CALCULATION";
    BusinessRuleType["CONSTRAINT"] = "CONSTRAINT";
    BusinessRuleType["POLICY"] = "POLICY";
})(BusinessRuleType || (exports.BusinessRuleType = BusinessRuleType = {}));
/**
 * Rule Severity
 */
var RuleSeverity;
(function (RuleSeverity) {
    RuleSeverity["INFO"] = "INFO";
    RuleSeverity["WARNING"] = "WARNING";
    RuleSeverity["ERROR"] = "ERROR";
    RuleSeverity["CRITICAL"] = "CRITICAL";
})(RuleSeverity || (exports.RuleSeverity = RuleSeverity = {}));
/**
 * Approval Action
 */
var ApprovalAction;
(function (ApprovalAction) {
    ApprovalAction["COMMENT"] = "COMMENT";
    ApprovalAction["APPROVE"] = "APPROVE";
    ApprovalAction["REJECT"] = "REJECT";
    ApprovalAction["REQUEST_CHANGES"] = "REQUEST_CHANGES";
})(ApprovalAction || (exports.ApprovalAction = ApprovalAction = {}));
