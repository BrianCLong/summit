"use strict";
/**
 * Email Service Types
 *
 * Comprehensive type definitions for the email template system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateCategory = void 0;
var EmailTemplateCategory;
(function (EmailTemplateCategory) {
    EmailTemplateCategory["AUTH"] = "auth";
    EmailTemplateCategory["NOTIFICATION"] = "notification";
    EmailTemplateCategory["INVESTIGATION"] = "investigation";
    EmailTemplateCategory["ALERT"] = "alert";
    EmailTemplateCategory["MARKETING"] = "marketing";
    EmailTemplateCategory["TRANSACTIONAL"] = "transactional";
    EmailTemplateCategory["SYSTEM"] = "system";
})(EmailTemplateCategory || (exports.EmailTemplateCategory = EmailTemplateCategory = {}));
