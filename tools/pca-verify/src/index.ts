import { performance } from 'node:perf_hooks';
import { applyOperation, resolveSourceArtifact } from './operations.js';
import { sha256Digest, verifySignature } from './utils.js';
import type {
  ChecksumFailure,
  Fixtures,
  LineageNode,
  Manifest,
  NumericVariance,
  VarianceReport,
  VerificationOptions,
  VerificationResult
} from './types.js';

export function verifyDAG(
  manifest: Manifest,
  fixtures: Fixtures,
  options: VerificationOptions = {}
): VerificationResult {
  const start = performance.now();
  const startedAt = new Date().toISOString();
  const failureLog: string[] = [];
  const evaluatedNodes: string[] = [];
  const checksumFailures: ChecksumFailure[] = [];
  const variances: VarianceReport[] = [];

  const signatureValid = verifySignature(manifest.lineage);
  if (!signatureValid) {
    failureLog.push('Lineage signature verification failed');
  }

  const nodeMap = new Map<string, LineageNode>();
  manifest.lineage.dag.nodes.forEach((node) => nodeMap.set(node.id, node));

  const pending = new Set(manifest.lineage.dag.nodes.map((node) => node.id));
  const results = new Map<string, unknown>();
  const artifactMap = new Map<string, unknown>();

  while (pending.size > 0) {
    const progress = Array.from(pending).filter((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (!node) {
        failureLog.push(`Manifest references unknown node ${nodeId}`);
        return false;
      }
      if (node.type === 'source') {
        return true;
      }
      const deps = node.inputs ?? [];
      return deps.every((dep) => results.has(dep));
    });

    if (progress.length === 0) {
      failureLog.push('Cycle detected in lineage DAG or missing dependencies');
      break;
    }

    for (const nodeId of progress) {
      const node = nodeMap.get(nodeId);
      if (!node) {
        continue;
      }
      pending.delete(nodeId);

      try {
        const inputs = node.type === 'source'
          ? [resolveSourceArtifact(node, fixtures)]
          : (node.inputs ?? []).map((input) => results.get(input));

        const computed = applyOperation(node, inputs, {
          manifest,
          seed: manifest.deterministicSeed
        });

        results.set(node.id, computed);
        artifactMap.set(node.artifact, computed);
        evaluatedNodes.push(node.id);

        const expectedChecksum = manifest.checksumTree[node.artifact];
        if (expectedChecksum) {
          const actualChecksum = sha256Digest(computed);
          if (actualChecksum !== expectedChecksum) {
            checksumFailures.push({
              artifact: node.artifact,
              expected: expectedChecksum,
              actual: actualChecksum
            });
            failureLog.push(
              `Checksum mismatch for ${node.artifact}: expected ${expectedChecksum} but received ${actualChecksum}`
            );
          }
        } else {
          failureLog.push(`No checksum found for artifact ${node.artifact}`);
        }
      } catch (error) {
        failureLog.push(`Node ${nodeId} execution error: ${(error as Error).message}`);
      }
    }
  }

  const toleranceFallback = typeof manifest.modelCard.hyperparameters.tolerance === 'number'
    ? (manifest.modelCard.hyperparameters.tolerance as number)
    : 0;
  const toleranceMultiplier = options.toleranceMultiplier ?? 1;

  for (const expectation of manifest.expectedOutputs) {
    const actual = artifactMap.get(expectation.artifact);
    if (actual === undefined) {
      failureLog.push(`Expected artifact ${expectation.artifact} was not produced`);
      continue;
    }

    const tolerance = (expectation.tolerance ?? toleranceFallback) * toleranceMultiplier;
    try {
      const variance = calculateVariance(expectation.expected, actual, tolerance);
      const withinTolerance = variance.every((entry) => Math.abs(entry.delta) <= tolerance);
      if (!withinTolerance) {
        failureLog.push(`Variance detected for node ${expectation.nodeId}`);
      }
      variances.push({
        nodeId: expectation.nodeId,
        artifact: expectation.artifact,
        withinTolerance,
        tolerance,
        variance
      });
    } catch (error) {
      failureLog.push(
        `Unable to evaluate variance for ${expectation.nodeId}: ${(error as Error).message}`
      );
    }
  }

  const completedAt = new Date().toISOString();
  const durationMs = performance.now() - start;

  const hasHardFailure = !signatureValid || checksumFailures.length > 0 || failureLog.some((entry) =>
    entry.toLowerCase().includes('error')
  );
  const hasVariance = variances.some((variance) => !variance.withinTolerance);

  let verdict: VerificationResult['verdict'];
  if (hasHardFailure) {
    verdict = 'error';
  } else if (hasVariance) {
    verdict = 'variance';
  } else {
    verdict = 'match';
  }

  return {
    verdict,
    signatureValid,
    checksumFailures,
    variances,
    evaluatedNodes,
    failureLog,
    startedAt,
    completedAt,
    durationMs
  };
}

export type {
  Manifest,
  Fixtures,
  VerificationOptions,
  VerificationResult,
  VarianceReport,
  ChecksumFailure
} from './types.js';

function calculateVariance(expected: unknown, actual: unknown, tolerance: number): NumericVariance[] {
  if (typeof expected === 'number' && typeof actual === 'number') {
    return [
      {
        actual,
        expected,
        delta: actual - expected
      }
    ];
  }

  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      throw new Error('Array lengths differ');
    }
    const delta: NumericVariance[] = [];
    expected.forEach((value, index) => {
      const actualValue = actual[index];
      if (typeof value !== 'number' || typeof actualValue !== 'number') {
        throw new Error('Array entries must be numeric');
      }
      delta.push({ actual: actualValue, expected: value, delta: actualValue - value });
    });
    return delta;
  }

  if (expected && typeof expected === 'object' && actual && typeof actual === 'object') {
    const expectedEntries = Object.entries(expected as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const actualEntries = Object.entries(actual as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    if (expectedEntries.length !== actualEntries.length) {
      throw new Error('Object field count differs');
    }

    const variance: NumericVariance[] = [];
    for (let index = 0; index < expectedEntries.length; index += 1) {
      const [expectedKey, expectedValue] = expectedEntries[index];
      const [actualKey, actualValue] = actualEntries[index];
      if (expectedKey !== actualKey) {
        throw new Error(`Field mismatch: expected ${expectedKey} but received ${actualKey}`);
      }
      if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
        variance.push({
          actual: actualValue,
          expected: expectedValue,
          delta: actualValue - expectedValue
        });
      } else {
        const nested = calculateVariance(expectedValue, actualValue, tolerance);
        variance.push(...nested);
      }
    }

    return variance;
  }

  throw new Error('Expected and actual values are not comparable');
}
