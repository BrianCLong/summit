import { applyDeltaOperator, clampBeta, deriveDeltaParams, normalize } from '../src/deltaOperator';

describe('deltaOperator', () => {
  it('returns identity when beta is 0', () => {
    const X = [1, 2, 3];
    const result = applyDeltaOperator({ X, k: [1, 0, 0], v: 0, beta: 0 });
    expect(result).toEqual(X);
  });

  it('projects away the k component when beta is 1', () => {
    const X = [3, 4];
    const k = normalize([1, 0]);
    const result = applyDeltaOperator({ X, k, v: 0, beta: 1 }) as number[];
    const projection = k[0] * result[0] + k[1] * result[1];
    expect(projection).toBeCloseTo(0, 5);
  });

  it('reflects across k when beta is 2', () => {
    const X = [3, 4];
    const k = normalize([1, 0]);
    const reflected = applyDeltaOperator({ X, k, v: 0, beta: 2 }) as number[];
    const projectionOriginal = k[0] * X[0] + k[1] * X[1];
    const projectionReflected = k[0] * reflected[0] + k[1] * reflected[1];
    expect(projectionReflected).toBeCloseTo(-projectionOriginal, 5);
  });

  it('handles matrix states with dv > 1', () => {
    const X = [
      [1, 2],
      [3, 4],
    ];
    const k = normalize([0, 1]);
    const v = [0.5, 1.5];
    const updated = applyDeltaOperator({ X, k, v, beta: clampBeta(1.2) }) as number[][];
    expect(updated.length).toBe(2);
    expect(updated[0].length).toBe(2);
    expect(updated[1][0]).not.toBe(X[1][0]);
  });

  it('derives delta params deterministically', () => {
    const params = deriveDeltaParams({
      queryEmbedding: [1, 0],
      retrievedContextEmbedding: [0.5, 0.5],
      confidence: 0.2,
      novelty: 0.8,
      config: { slope: 2, bias: 0 },
      valueDimensions: 1,
    });
    expect(params.k).toEqual([1, 0]);
    expect(params.beta).toBeGreaterThan(0);
    expect(params.beta).toBeLessThanOrEqual(2);
  });
});
