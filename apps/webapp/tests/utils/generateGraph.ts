import type { GraphData } from '../../src/data/mockGraph';

interface GenerateGraphOptions {
  seed?: number;
  nodes?: number;
}

function createRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

export function generateGraphData(
  options: GenerateGraphOptions = {},
): GraphData {
  const { seed = 42, nodes = 4 } = options;
  const random = createRandom(seed);
  const baseTime = 1710000000000;

  const nodeData = Array.from({ length: nodes }).map((_, idx) => {
    const id = `node-${idx + 1}`;
    const label = id.toUpperCase();
    const timestamp = baseTime + idx * 90 * 60 * 1000;
    const coords: [number, number] = [
      parseFloat((random() * 180 - 90).toFixed(3)),
      parseFloat((random() * 360 - 180).toFixed(3)),
    ];
    return { id, label, timestamp, coords };
  });

  const edges = nodeData.slice(1).map((node, idx) => ({
    id: `edge-${idx + 1}`,
    source: nodeData[idx].id,
    target: node.id,
  }));

  return { nodes: nodeData, edges };
}
