"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock schema validator
function validateTempoLink(tempoLink) {
    if (!tempoLink.rationaleEvidenceIds || tempoLink.rationaleEvidenceIds.length === 0) {
        throw new Error('ValidationError: TempoLink must include rationaleEvidenceIds[]');
    }
    return true;
}
(0, globals_1.describe)('TempoLink Association vs Causation Rule', () => {
    (0, globals_1.it)('should pass when rationale evidence is provided', () => {
        const validTempoLink = {
            triggerEventKind: 'KINETIC',
            surgeWindowHours: { min: 3, max: 6 },
            rationaleEvidenceIds: ['EID-CIG-000002']
        };
        (0, globals_1.expect)(() => validateTempoLink(validTempoLink)).not.toThrow();
    });
    (0, globals_1.it)('should throw ValidationError when rationale evidence is missing', () => {
        const invalidTempoLink = {
            triggerEventKind: 'KINETIC',
            surgeWindowHours: { min: 3, max: 6 },
            rationaleEvidenceIds: []
        };
        (0, globals_1.expect)(() => validateTempoLink(invalidTempoLink)).toThrow('ValidationError: TempoLink must include rationaleEvidenceIds[]');
    });
    (0, globals_1.it)('should throw ValidationError when rationale evidence is undefined', () => {
        const invalidTempoLink = {
            triggerEventKind: 'CYBER',
            surgeWindowHours: { min: 1, max: 2 }
        };
        (0, globals_1.expect)(() => validateTempoLink(invalidTempoLink)).toThrow('ValidationError: TempoLink must include rationaleEvidenceIds[]');
    });
});
