"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphSummary = void 0;
var GraphSummary;
(function (GraphSummary) {
    let status;
    (function (status) {
        status["DRAFT"] = "draft";
        status["ACTIVE"] = "active";
        status["ARCHIVED"] = "archived";
    })(status = GraphSummary.status || (GraphSummary.status = {}));
})(GraphSummary || (exports.GraphSummary = GraphSummary = {}));
