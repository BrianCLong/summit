export function analyzeDependencies(graph, fanInRiskThreshold = 10) {
  const fanIn = {};

  for (const module of graph.modules) {
    for (const dependency of module.imports) {
      fanIn[dependency] = (fanIn[dependency] ?? 0) + 1;
    }
  }

  const highRisk = Object.entries(fanIn)
    .filter(([, count]) => count > fanInRiskThreshold)
    .map(([dependency, consumers]) => ({ dependency, consumers }))
    .sort((a, b) => b.consumers - a.consumers);

  const externalDependencies = Object.keys(fanIn).filter((item) => !item.startsWith('.')).length;

  return {
    fanIn,
    highRisk,
    externalDependencies,
  };
}
