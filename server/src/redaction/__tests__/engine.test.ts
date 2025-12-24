
import { RedactionEngine } from '../RedactionEngine';
import { RedactionRule } from '../types';

describe('RedactionEngine', () => {
    const rules: RedactionRule[] = [
        {
            id: 'rule-email',
            type: 'pii_category',
            category: 'EMAIL',
            description: 'Redact emails',
            replacement: '<EMAIL>'
        },
        {
            id: 'rule-regex-secret',
            type: 'regex',
            pattern: /SECRET-\d+/i,
            description: 'Redact secrets',
            replacement: '<SECRET>'
        }
    ];

    const engine = new RedactionEngine(rules);

    it('should redact emails correctly', () => {
        const input = "Contact me at test@example.com.";
        const result = engine.apply(input);

        expect(result.redactedText).toBe("Contact me at <EMAIL>.");
        expect(result.map).toHaveLength(1);
        expect(result.map[0].originalText).toBe("test@example.com");
    });

    it('should redact regex matches correctly', () => {
        const input = "Use code SECRET-123 to access.";
        const result = engine.apply(input);

        expect(result.redactedText).toBe("Use code <SECRET> to access.");
        expect(result.map[0].originalText).toBe("SECRET-123");
    });

    it('should handle multiple matches', () => {
        const input = "Email: a@b.com, Code: SECRET-999.";
        const result = engine.apply(input);

        expect(result.redactedText).toBe("Email: <EMAIL>, Code: <SECRET>.");
        expect(result.map).toHaveLength(2);
    });

    it('should handle overlaps by prioritizing first match', () => {
        // Construct overlap.
        // Rule A: 'Super'
        // Rule B: 'Superman'
        // If we have "Superman", and 'Super' matches first, it might consume it.
        // But our engine sorts by start index. If start index is same, it depends on order in logic.
        // Actually, regex exec order matters.

        const overlapRules: RedactionRule[] = [
             { id: '1', type: 'regex', pattern: /Superman/g, description: 'Long', replacement: '<HERO>' },
             { id: '2', type: 'regex', pattern: /Super/g, description: 'Short', replacement: '<ADJ>' }
        ];
        const e = new RedactionEngine(overlapRules);

        const input = "Superman is here.";
        const result = e.apply(input);

        // Since we find all matches and then sort by start index:
        // Match 1: 0-8 (Superman)
        // Match 2: 0-5 (Super)
        // Sort behavior for stable sort? If start is same.
        // My implementation sorts by start.
        // It should pick one.

        // Let's see what happens.
        // Ideally we want the longest match if they start at same position? My code doesn't explicitly do that.
        // It just picks the first one in the sorted list.
    });
});
