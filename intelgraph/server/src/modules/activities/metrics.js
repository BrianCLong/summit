const METRIC_BLUEPRINTS = [
  {
    name: 'harmonizedInsight',
    label: 'Harmonized Insight',
    description:
      'Measures how effectively intelligence signals are merged into a shared narrative.',
    weight: 1.2,
    configKey: 'collaborationIntensity',
  },
  {
    name: 'dynamicCoordination',
    label: 'Dynamic Coordination',
    description:
      'Evaluates tempo-aware coordination across hybrid teams and channels.',
    weight: 0.9,
    configKey: 'hybridCoordination',
  },
  {
    name: 'dataConvergence',
    label: 'Data Convergence',
    description:
      'Tracks confidence in cross-domain data fusion and sync operations.',
    weight: 1.05,
    configKey: 'globalDataSync',
  },
  {
    name: 'truthSync',
    label: 'Truth Synchronization',
    description:
      'Highlights integrity guardrail performance for fact patterns.',
    weight: 1.4,
    configKey: 'integrityThreshold',
  },
  {
    name: 'scenarioArchitect',
    label: 'Scenario Architect',
    description:
      'Scores the strength of scenario simulations feeding the engagement plan.',
    weight: 1.1,
    configKey: 'coherenceScale',
  },
  {
    name: 'integrityAssurance',
    label: 'Integrity Assurance',
    description:
      'Quantifies compliance posture across the selected mission set.',
    weight: 0.85,
    configKey: 'complianceStandard',
  },
  {
    name: 'engagementCascade',
    label: 'Engagement Cascade',
    description: 'Captures downstream engagement amplification readiness.',
    weight: 1.3,
    configKey: 'engagementAmplification',
  },
  {
    name: 'stabilizationNexus',
    label: 'Stabilization Nexus',
    description:
      'Represents the resiliency of coordination loops and failsafes.',
    weight: 1.0,
    configKey: 'stabilizationNexus',
  },
  {
    name: 'opportunitySwarm',
    label: 'Opportunity Swarm',
    description:
      'Signals the density of near-term opportunities surfaced for analysts.',
    weight: 1.25,
    configKey: 'opportunityPrecision',
  },
  {
    name: 'engagementSynergizer',
    label: 'Engagement Synergizer',
    description:
      'Captures how well the plan balances intensity with coordination overhead.',
    weight: 1.15,
    configKey: 'engagementIntensity',
  },
];

module.exports = {
  METRIC_BLUEPRINTS,
};
