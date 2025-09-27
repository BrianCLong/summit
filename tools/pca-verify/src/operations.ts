import type { Fixtures, LineageNode, Manifest } from './types.js';

interface OperationContext {
  manifest: Manifest;
  seed: number;
}

function toNumericArray(value: unknown, node: LineageNode): number[] {
  if (!Array.isArray(value)) {
    throw new Error(`Node ${node.id} expected numeric array but received ${typeof value}`);
  }

  return value.map((item, index) => {
    if (typeof item !== 'number' || Number.isNaN(item)) {
      throw new Error(`Node ${node.id} input at index ${index} is not numeric`);
    }

    return item;
  });
}

function getWeights(manifest: Manifest, node: LineageNode): number[] {
  const fromParams = Array.isArray(node.params?.weights)
    ? (node.params?.weights as number[])
    : undefined;
  const fromModel = Array.isArray(manifest.modelCard.hyperparameters.weights)
    ? (manifest.modelCard.hyperparameters.weights as number[])
    : undefined;

  const weights = fromParams ?? fromModel;
  if (!weights) {
    throw new Error(`Node ${node.id} requires weights but none were provided`);
  }

  return weights.map((weight, index) => {
    if (typeof weight !== 'number' || Number.isNaN(weight)) {
      throw new Error(`Weight ${index} for node ${node.id} is not numeric`);
    }
    return weight;
  });
}

export function applyOperation(
  node: LineageNode,
  inputs: unknown[],
  context: OperationContext
): unknown {
  if (node.type === 'source') {
    return inputs[0];
  }

  const primary = inputs[0];
  switch (node.operation) {
    case 'scale': {
      const factor = typeof node.params?.factor === 'number' ? (node.params.factor as number) : 1;
      return toNumericArray(primary, node).map((value) => value * factor);
    }
    case 'offset':
    case 'add': {
      const offset = typeof node.params?.offset === 'number'
        ? (node.params.offset as number)
        : typeof node.params?.add === 'number'
          ? (node.params.add as number)
          : 0;
      return toNumericArray(primary, node).map((value) => value + offset);
    }
    case 'weighted-sum': {
      const weights = getWeights(context.manifest, node);
      const numbers = toNumericArray(primary, node);
      if (numbers.length !== weights.length) {
        throw new Error(
          `Node ${node.id} weighted-sum inputs (${numbers.length}) do not match weights (${weights.length})`
        );
      }
      const sum = numbers.reduce((acc, value, index) => acc + value * weights[index], 0);
      return { score: Number(sum.toFixed(6)) };
    }
    case 'moving-average': {
      const window = typeof node.params?.window === 'number' ? (node.params.window as number) : 3;
      const numbers = toNumericArray(primary, node);
      if (window <= 0 || !Number.isInteger(window)) {
        throw new Error(`Node ${node.id} moving-average window must be a positive integer`);
      }
      const averages: number[] = [];
      for (let index = 0; index < numbers.length; index += 1) {
        const start = Math.max(0, index - window + 1);
        const slice = numbers.slice(start, index + 1);
        const total = slice.reduce((acc, value) => acc + value, 0);
        averages.push(total / slice.length);
      }
      return averages;
    }
    default:
      throw new Error(`Unsupported operation: ${node.operation ?? 'undefined'}`);
  }
}

export function resolveSourceArtifact(node: LineageNode, fixtures: Fixtures): unknown {
  const artifact = fixtures[node.artifact];
  if (artifact === undefined) {
    throw new Error(`Missing fixture for artifact ${node.artifact}`);
  }

  return artifact;
}
