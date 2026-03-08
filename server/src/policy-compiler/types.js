"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnforcementDecision = exports.SensitivityClass = void 0;
const sensitivity_js_1 = require("../pii/sensitivity.js");
Object.defineProperty(exports, "SensitivityClass", { enumerable: true, get: function () { return sensitivity_js_1.SensitivityClass; } });
/**
 * Epic C2: Compiler Outputs
 */
var EnforcementDecision;
(function (EnforcementDecision) {
    EnforcementDecision["ALLOW"] = "ALLOW";
    EnforcementDecision["DENY"] = "DENY";
    EnforcementDecision["CONDITIONAL"] = "CONDITIONAL";
})(EnforcementDecision || (exports.EnforcementDecision = EnforcementDecision = {}));
