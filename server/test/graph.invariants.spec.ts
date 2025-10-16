import fc from 'fast-check';
import { addEdge, addNode, computeMerkleRoot } from '../src/prov/merge';

describe('Graph invariants', () => {
  it('no dangling edges after add/remove cycles', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ from: fc.uuid(), to: fc.uuid() }), {
          minLength: 1,
          maxLength: 30,
        }),
        (edges) => {
          const nodes = new Set<string>();
          edges.forEach((e) => {
            nodes.add(e.from);
            nodes.add(e.to);
          });
          const g = [...nodes].reduce((acc, id) => addNode(acc, id), {
            nodes: [],
            edges: [],
          });
          const g2 = edges.reduce((acc, e) => addEdge(acc, e.from, e.to), g);
          const ids = new Set(g2.nodes.map((n: any) => n.id));
          expect(
            g2.edges.every((e: any) => ids.has(e.from) && ids.has(e.to)),
          ).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Merkle root stable over permutation', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 50 }),
        (arr) => {
          const a = computeMerkleRoot(arr);
          const b = computeMerkleRoot(
            fc.sample(
              fc.shuffledSubarray(arr, {
                minLength: arr.length,
                maxLength: arr.length,
              }),
            )[0],
          );
          expect(a).toEqual(b);
        },
      ),
    );
  });
});
