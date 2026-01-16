import { describe, it, expect } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import { MetricValidator } from '../validator.js';

const DICT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../metrics.yaml');

describe('Metric Validator', () => {
    const validator = new MetricValidator(DICT_PATH);

    it('should validate the metrics.yaml schema', () => {
        const errors = validator.validate();
        expect(errors).toEqual([]);
    });

    it('should fail if event is undocumented', () => {
        const emitted = ['page_view', 'unknown_event'];
        const errors = validator.validateCoverage(emitted);
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('unknown_event');
    });

    it('should pass if all events are documented', () => {
        const emitted = ['page_view', 'api_call'];
        const errors = validator.validateCoverage(emitted);
        expect(errors).toEqual([]);
    });
});
