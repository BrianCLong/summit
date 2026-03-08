"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeType = exports.ReviewDecision = void 0;
var ReviewDecision;
(function (ReviewDecision) {
    ReviewDecision["APPROVED"] = "APPROVED";
    ReviewDecision["REJECTED"] = "REJECTED";
    ReviewDecision["NEEDS_REVIEW"] = "NEEDS_REVIEW";
})(ReviewDecision || (exports.ReviewDecision = ReviewDecision = {}));
var ChangeType;
(function (ChangeType) {
    ChangeType["CODE"] = "CODE";
    ChangeType["CONFIG"] = "CONFIG";
    ChangeType["DOCS"] = "DOCS";
    ChangeType["INFRA"] = "INFRA";
})(ChangeType || (exports.ChangeType = ChangeType = {}));
