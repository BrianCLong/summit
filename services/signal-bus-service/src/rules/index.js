"use strict";
/**
 * Rules Module
 *
 * Exports rule engine components.
 *
 * @module rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRuleEvaluator = exports.RuleEvaluatorService = void 0;
var rule_evaluator_js_1 = require("./rule-evaluator.js");
Object.defineProperty(exports, "RuleEvaluatorService", { enumerable: true, get: function () { return rule_evaluator_js_1.RuleEvaluatorService; } });
Object.defineProperty(exports, "createRuleEvaluator", { enumerable: true, get: function () { return rule_evaluator_js_1.createRuleEvaluator; } });
