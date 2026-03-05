import { describe, it, expect } from '@jest/globals';

// Mock schema validator
function validateTempoLink(tempoLink: any) {
    if (!tempoLink.rationaleEvidenceIds || tempoLink.rationaleEvidenceIds.length === 0) {
        throw new Error('ValidationError: TempoLink must include rationaleEvidenceIds[]');
    }
    return true;
}

describe('TempoLink Association vs Causation Rule', () => {
    it('should pass when rationale evidence is provided', () => {
        const validTempoLink = {
            triggerEventKind: 'KINETIC',
            surgeWindowHours: { min: 3, max: 6 },
            rationaleEvidenceIds: ['EID-CIG-000002']
        };

        expect(() => validateTempoLink(validTempoLink)).not.toThrow();
    });

    it('should throw ValidationError when rationale evidence is missing', () => {
        const invalidTempoLink = {
            triggerEventKind: 'KINETIC',
            surgeWindowHours: { min: 3, max: 6 },
            rationaleEvidenceIds: []
        };

        expect(() => validateTempoLink(invalidTempoLink)).toThrow('ValidationError: TempoLink must include rationaleEvidenceIds[]');
    });

    it('should throw ValidationError when rationale evidence is undefined', () => {
        const invalidTempoLink = {
            triggerEventKind: 'CYBER',
            surgeWindowHours: { min: 1, max: 2 }
        };

        expect(() => validateTempoLink(invalidTempoLink)).toThrow('ValidationError: TempoLink must include rationaleEvidenceIds[]');
    });
});
