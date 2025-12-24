
import { ScoringEngine } from '../ScoringEngine';
import { EvidenceItem } from '../types';

describe('ScoringEngine', () => {
    it('should calculate perfect score for ideal evidence', () => {
        const item: EvidenceItem = {
            id: '1',
            sourceType: 'official',
            hasDigitalSignature: true,
            timestamp: new Date(), // Now
            corroborationCount: 5
        };

        const result = ScoringEngine.calculateScore(item);
        expect(result.totalScore).toBe(100);
        expect(result.breakdown.sourceReliability).toBe(30);
        expect(result.breakdown.provenanceCompleteness).toBe(30);
        expect(result.breakdown.recency).toBe(20);
        expect(result.breakdown.corroboration).toBe(20);
    });

    it('should penalize weak evidence', () => {
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years old

        const item: EvidenceItem = {
            id: '2',
            sourceType: 'rumor',
            hasDigitalSignature: false,
            timestamp: oldDate,
            corroborationCount: 0
        };

        const result = ScoringEngine.calculateScore(item);
        expect(result.totalScore).toBe(0);
        expect(result.missingFields).toContain('digitalSignature');
        expect(result.reasons).toContain('Evidence is older than 1 year.');
    });
});
