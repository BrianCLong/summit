import { findRedundancyClusters } from '../../src/narrative/redundancy/cluster';
import { encodeStructure } from '../../src/narrative/redundancy/structure_encoder';
import { calculateStructuralSimilarity } from '../../src/narrative/redundancy/similarity';

describe('Structural Redundancy Detector', () => {
  const doc1 = { id: '1', text: 'A implies B because C' };
  const doc2 = { id: '2', text: 'X implies Y because Z' }; // Structurally identical
  const doc3 = { id: '3', text: 'Cat implies Dog' }; // Different structure

  test('Encodes structure correctly', () => {
    const g1 = encodeStructure(doc1.text);
    const g2 = encodeStructure(doc2.text);
    const g3 = encodeStructure(doc3.text);

    expect(g1.fingerprint).toBe(g2.fingerprint);
    expect(g1.fingerprint).not.toBe(g3.fingerprint);
  });

  test('Calculates similarity', () => {
    const g1 = encodeStructure(doc1.text);
    const g2 = encodeStructure(doc2.text);
    const g3 = encodeStructure(doc3.text);

    expect(calculateStructuralSimilarity(g1, g2)).toBe(1);
    expect(calculateStructuralSimilarity(g1, g3)).toBeLessThan(1);
  });

  test('Clusters redundant narratives', () => {
    const docs = [doc1, doc2, doc3];
    const clusters = findRedundancyClusters(docs);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].narrative_ids).toContain('1');
    expect(clusters[0].narrative_ids).toContain('2');
    expect(clusters[0].narrative_ids).not.toContain('3');
    expect(clusters[0].size).toBe(2);
  });
});
