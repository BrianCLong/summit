// Mock for @intelgraph/attack-surface
export const analyzeSurface = async () => ({ score: 0, findings: [] });

export const SurfaceScanner = class {
  scan() { return Promise.resolve({ vulnerabilities: [] }); }
};

export const AttackSurfaceMonitor = class {
  constructor() {}
  start() { return Promise.resolve(); }
  stop() { return Promise.resolve(); }
  getMetrics() { return { endpoints: 0, vulnerabilities: 0 }; }
  scan() { return Promise.resolve({ score: 0, findings: [] }); }
};

export default { analyzeSurface, SurfaceScanner, AttackSurfaceMonitor };
