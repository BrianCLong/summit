import { DetectionEvent, DetectionRule, RedTeamProbe } from '../types/index.js';
import { Logger } from '../utils/Logger.js';

export class DetectionEngine {
  private rules: DetectionRule[];
  private logger: Logger;

  constructor(rules: DetectionRule[], logger = new Logger('DetectionEngine')) {
    this.rules = rules;
    this.logger = logger;
  }

  evaluateProbe(probe: RedTeamProbe): DetectionEvent[] {
    this.logger.debug(
      `Evaluating probe ${probe.id} on channel ${probe.channel} targeting ${probe.vector}`
    );

    return this.rules.map((rule) => {
      const applies = !rule.vector || rule.vector === probe.vector;
      const regex = this.compileRuleRegex(rule);
      const triggered = Boolean(regex && applies && regex.test(probe.payload));

      return {
        ruleId: rule.id,
        description: rule.description,
        triggered,
        severity: rule.severity,
        signal: triggered ? 1 : 0,
        evidence: triggered
          ? `Payload matched pattern ${rule.pattern}`
          : regex
            ? undefined
            : `Invalid regex pattern: ${rule.pattern}`,
      };
    });
  }

  isBlocked(events: DetectionEvent[]): boolean {
    return events.some(
      (event) => event.triggered && (event.severity === 'high' || event.severity === 'critical')
    );
  }

  findMissingControls(requiredControls: string[] = []): string[] {
    if (!requiredControls.length) {
      return [];
    }

    const controlExpectations = this.rules
      .map((rule) => rule.controlExpectation)
      .filter(Boolean) as string[];

    return requiredControls.filter(
      (control) =>
        !controlExpectations.some((expectation) =>
          expectation.toLowerCase().includes(control.toLowerCase())
        )
    );
  }

  private compileRuleRegex(rule: DetectionRule): RegExp | null {
    try {
      return new RegExp(rule.pattern, 'i');
    } catch (error) {
      this.logger.warn(
        `Invalid regex pattern for rule ${rule.id}: ${rule.pattern}`
      );
      return null;
    }
  }
}
