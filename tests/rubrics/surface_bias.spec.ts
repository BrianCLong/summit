import { RubricEvaluator } from '../../src/evals/rubrics/evaluator.js';
import { buildCompositeRubric } from '../../src/evals/rubrics/normalize.js';

describe('Surface Bias Evaluation', () => {
    it('should score accurately based on criteria', () => {
        const composite = buildCompositeRubric('Instruction', ['mention qubits']);
        const evalRun = RubricEvaluator.evaluate(composite, 'output with qubits', 'model', 'EVID:test');
        expect(evalRun.totalScore).toBe(1.0);
    });
});
