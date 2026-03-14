export function computeDrift(previous, current) {
  const previousDeps = new Set(previous.modules.flatMap((module) => module.imports));
  const currentDeps = new Set(current.modules.flatMap((module) => module.imports));

  const newDependencies = [...currentDeps].filter((item) => !previousDeps.has(item));
  const removedDependencies = [...previousDeps].filter((item) => !currentDeps.has(item));
  const denominator = Math.max(current.modules.length, 1);

  return {
    newDependencies: newDependencies.length,
    removedDependencies: removedDependencies.length,
    driftScore: Math.min(Number((newDependencies.length / denominator).toFixed(4)), 1),
  };
}
