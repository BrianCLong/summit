"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const evaluator_js_1 = require("../../src/evals/rubrics/evaluator.js");
const normalize_js_1 = require("../../src/evals/rubrics/normalize.js");
describe('Surface Bias Evaluation', () => {
    it('should score accurately based on criteria', () => {
        const composite = (0, normalize_js_1.buildCompositeRubric)('Instruction', ['mention qubits']);
        const evalRun = evaluator_js_1.RubricEvaluator.evaluate(composite, 'output with qubits', 'model', 'EVID:test');
        expect(evalRun.totalScore).toBe(1.0);
    });
});
