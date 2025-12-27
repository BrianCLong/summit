import { ObservabilityFabric } from './fabric.js';
import {
  FailureScenario,
  ObservabilitySignal,
  SimulationResult,
} from './types.js';

export class FailureSimulator {
  constructor(private readonly fabric: ObservabilityFabric) {}

  simulate(scenario: FailureScenario): SimulationResult {
    const outcomes: SimulationResult['outcomes'] = [];
    const groups = this.fabric.getCorrelatedGroups();

    for (const step of scenario.steps) {
      const matchedSignals: ObservabilitySignal[] = [];
      for (const expected of step.expectedSignals) {
        const match = groups.flatMap((group) => group.signals).find((signal) => {
          const matchesService = signal.service === expected.service;
          const matchesKind = expected.kind ? signal.kind === expected.kind : true;
          const matchesName = expected.name ? (signal as any).name === expected.name : true;
          const matchesSeverity = expected.severity ? signal.severity === expected.severity : true;
          return matchesService && matchesKind && matchesName && matchesSeverity;
        });
        if (match) {
          matchedSignals.push(match);
        }
      }

      outcomes.push({
        step: step.description,
        matchedSignals,
        notes: matchedSignals.length === step.expectedSignals.length
          ? 'all expected signals observed'
          : 'missing expected signals; investigate instrumentation gaps',
      });
    }

    const completed = outcomes.every((outcome) => outcome.matchedSignals.length > 0);

    return {
      scenarioId: scenario.id,
      completed,
      outcomes,
      recoveryEtaMinutes: completed ? scenario.expectedRecoveryMinutes : undefined,
    };
  }
}
