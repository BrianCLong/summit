export const AgenticConfig = {
  orchestrator: {
    loopIntervalMs: 100, // Speed up for demo
    maxCycles: 5, // Just run 5 cycles for demo
    logLevel: 'info',
  },
  invariants: {
    enforceSecurity: true,
    enforceDataIntegrity: true,
    enforceGoldenPath: true,
  },
  omniscience: {
    metricsEnabled: true,
    tracingEnabled: true,
    logsEnabled: true,
  },
  void: {
    dryRun: true, // Don't delete files by default, just report
    ignorePatterns: ['node_modules', 'dist', '.git'],
  },
  multiverse: {
    defaultUniverse: 'prime',
    activeUniverses: ['prime', 'beta', 'canary'],
  }
};
