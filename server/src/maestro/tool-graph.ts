export interface ToolDefinition {
  id: string;
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  capabilityTags: string[];
  dependencies: string[];
}

export interface ToolDependencyGraph {
  tools: ToolDefinition[];
}

export interface ToolTaskNode {
  id: string;
  toolId: string;
  dependencies: string[];
}

export interface ToolTaskGraph {
  nodes: ToolTaskNode[];
}

export interface ToolGraphSynthesisOptions {
  targetSize: number;
  seed?: number;
}

export interface ToolGraphVerificationResult {
  executable: boolean;
  missingDependencies: Record<string, string[]>;
}

function createSeededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function buildAdjacencyMap(tools: ToolDefinition[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const tool of tools) {
    if (!map.has(tool.id)) {
      map.set(tool.id, new Set());
    }
    for (const dep of tool.dependencies) {
      if (!map.has(dep)) {
        map.set(dep, new Set());
      }
      map.get(tool.id)?.add(dep);
      map.get(dep)?.add(tool.id);
    }
  }
  return map;
}

export function synthesizeConnectedSubgraph(
  graph: ToolDependencyGraph,
  options: ToolGraphSynthesisOptions,
): ToolDefinition[] {
  const sortedTools = [...graph.tools].sort((a, b) => a.id.localeCompare(b.id));
  if (sortedTools.length === 0) {
    return [];
  }

  const random = createSeededRandom(options.seed ?? sortedTools.length);
  const startIndex = Math.floor(random() * sortedTools.length);
  const startTool = sortedTools[startIndex];
  const adjacency = buildAdjacencyMap(sortedTools);

  const visited = new Set<string>();
  const queue: string[] = [startTool.id];
  const selection: ToolDefinition[] = [];

  while (queue.length > 0 && selection.length < options.targetSize) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);
    const tool = sortedTools.find((item) => item.id === current);
    if (tool) {
      selection.push(tool);
    }
    const neighbors = Array.from(adjacency.get(current) ?? []).sort();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && selection.length + queue.length < options.targetSize) {
        queue.push(neighbor);
      }
    }
  }

  return selection;
}

export function buildTaskGraph(tools: ToolDefinition[]): ToolTaskGraph {
  const nodes = tools.map((tool) => ({
    id: `task-${tool.id}`,
    toolId: tool.id,
    dependencies: tool.dependencies,
  }));
  return { nodes };
}

export function verifyTaskGraph(
  graph: ToolTaskGraph,
): ToolGraphVerificationResult {
  const toolIds = new Set(graph.nodes.map((node) => node.toolId));
  const missingDependencies: Record<string, string[]> = {};

  for (const node of graph.nodes) {
    const missing = node.dependencies.filter((dep) => !toolIds.has(dep));
    if (missing.length > 0) {
      missingDependencies[node.toolId] = missing;
    }
  }

  return {
    executable: Object.keys(missingDependencies).length === 0,
    missingDependencies,
  };
}

export function synthesizeTaskGraph(
  toolGraph: ToolDependencyGraph,
  options: ToolGraphSynthesisOptions,
): { tasks: ToolTaskGraph; verification: ToolGraphVerificationResult } {
  const subgraph = synthesizeConnectedSubgraph(toolGraph, options);
  const tasks = buildTaskGraph(subgraph);
  const verification = verifyTaskGraph(tasks);
  return { tasks, verification };
}
