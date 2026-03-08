"use strict";
/**
 * Duplicate and near-duplicate detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateDetector = void 0;
class DuplicateDetector {
    detectDuplicates(documents, threshold = 0.9) {
        const duplicates = new Map();
        for (let i = 0; i < documents.length; i++) {
            for (let j = i + 1; j < documents.length; j++) {
                const similarity = this.calculateSimilarity(documents[i], documents[j]);
                if (similarity >= threshold) {
                    const existing = duplicates.get(i) || [];
                    existing.push(j);
                    duplicates.set(i, existing);
                }
            }
        }
        return duplicates;
    }
    calculateSimilarity(doc1, doc2) {
        const set1 = new Set(doc1.toLowerCase().match(/\b\w+\b/g) || []);
        const set2 = new Set(doc2.toLowerCase().match(/\b\w+\b/g) || []);
        const intersection = new Set([...set1].filter((x) => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    }
}
exports.DuplicateDetector = DuplicateDetector;
