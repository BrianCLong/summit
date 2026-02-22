import {
  AfterActionReport,
  ArtifactRequestEvent,
  CustomerCommunicationEvent,
  DrillScenario,
  IntegrationAdapter,
  IntegrationArtifact,
  IntegrationName,
  IntegrationReport,
  RegulatorQueryEvent,
  ResponseDrivenEvent,
  SlaBreach,
  TimelineEntry,
} from './types';
import { SeededRandom } from './seededRandom';
import { defaultScenario } from './defaultScenario';
import { defaultIntegrations } from './integrations';

const HOURS_IN_DAY = 24;
const MILLIS_PER_HOUR = 60 * 60 * 1000;

type ActiveResponseEvent =
  | RegulatorQueryEvent
  | CustomerCommunicationEvent
  | ArtifactRequestEvent;

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

export class PrivacyIncidentDrillEngine {
  private readonly scenario: DrillScenario;
  private readonly integrations: Record<IntegrationName, IntegrationAdapter>;

  constructor(
    scenario: DrillScenario = defaultScenario,
    integrations: Partial<Record<IntegrationName, IntegrationAdapter>> = {},
  ) {
    this.scenario = scenario;
    this.integrations = {
      ...defaultIntegrations,
      ...integrations,
    };
  }

  run(seed = 1337): AfterActionReport {
    const rng = new SeededRandom(seed);
    const startDate = cloneDate(this.scenario.startDate);
    const timeline: TimelineEntry[] = [];
    const breaches: SlaBreach[] = [];
    const integrationArtifacts: Record<
      IntegrationName,
      { adapter: IntegrationAdapter; items: IntegrationArtifact[] }
    > = {
      IAB: { adapter: this.integrations.IAB, items: [] },
      IDTL: { adapter: this.integrations.IDTL, items: [] },
    };

    let lastCompletion = cloneDate(startDate);
    const evidenceDurations: number[] = [];
    let artifactSequence = 0;

    const sortedEvents = [...this.scenario.events].sort(
      (a, b) => a.dayOffset - b.dayOffset,
    );

    for (const event of sortedEvents) {
      const scheduledAt = new Date(
        startDate.getTime() + event.dayOffset * HOURS_IN_DAY * MILLIS_PER_HOUR,
      );
      const startedAt = cloneDate(scheduledAt);
      let completedAt = cloneDate(startedAt);
      let status: TimelineEntry['status'] = 'informational';
      const metadata: Record<string, unknown> = {};
      let actualHours: number | undefined;
      let plannedHours: number | undefined;

      switch (event.type) {
        case 'trigger':
          metadata.severity = event.severity;
          break;
        case 'fact':
          metadata.detail = event.detail;
          break;
        default: {
          const responseEvent = event as ActiveResponseEvent;
          plannedHours = responseEvent.dueInHours;
          const actual = this.resolveActualHours(responseEvent, rng);
          actualHours = roundHours(actual);
          const slaLimit = this.resolveSlaLimit(responseEvent);
          completedAt = new Date(
            startedAt.getTime() + actualHours * MILLIS_PER_HOUR,
          );
          status = actualHours > slaLimit ? 'breached' : 'on_track';

          metadata.plannedHours = plannedHours;
          metadata.slaLimitHours = slaLimit;
          metadata.actualHours = actualHours;

          if (status === 'breached') {
            const gapHours = roundHours(actualHours - slaLimit);
            const breach: SlaBreach = {
              eventId: responseEvent.id,
              eventTitle: responseEvent.title,
              eventType: responseEvent.type,
              gapHours,
              recommendedAction: this.buildRecommendation(
                responseEvent,
                gapHours,
              ),
            };
            metadata.gapHours = gapHours;
            breaches.push(breach);
          }

          if (responseEvent.type === 'regulator_query') {
            metadata.regulator = responseEvent.regulator;
            metadata.query = responseEvent.query;
          }

          if (responseEvent.type === 'customer_comm') {
            metadata.audience = responseEvent.audience;
            metadata.channel = responseEvent.channel;
          }

          if (responseEvent.type === 'artifact_request') {
            const artifactEvent = responseEvent as ArtifactRequestEvent;
            const integration = integrationArtifacts[artifactEvent.integration];
            if (!integration) {
              throw new Error(
                `No integration configured for ${artifactEvent.integration}`,
              );
            }
            artifactSequence += 1;
            const artifact = integration.adapter.produceArtifact({
              scenario: this.scenario,
              event: artifactEvent,
              requestedAt: startedAt,
              fulfilledAt: completedAt,
              responseHours: actualHours,
              seed,
              sequence: artifactSequence,
            });
            integration.items.push(artifact);
            evidenceDurations.push(actualHours);
            metadata.integration = artifactEvent.integration;
            metadata.artifactId = artifact.artifactId;
            metadata.artifactUri = artifact.uri;
          }

          break;
        }
      }

      if (completedAt.getTime() > lastCompletion.getTime()) {
        lastCompletion = cloneDate(completedAt);
      }

      timeline.push({
        eventId: event.id,
        type: event.type,
        title: event.title,
        scheduledAt: scheduledAt.toISOString(),
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        plannedHours,
        actualHours,
        status,
        summary: event.summary,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
    }

    const evidenceRequests = evidenceDurations.length;
    const averageTimeToEvidenceHours = evidenceRequests
      ? roundHours(
          evidenceDurations.reduce((sum, value) => sum + value, 0) /
            evidenceRequests,
        )
      : 0;
    const maxTimeToEvidenceHours = evidenceRequests
      ? roundHours(Math.max(...evidenceDurations))
      : 0;

    const score = this.calculateScore({
      breaches,
      averageTimeToEvidenceHours,
      maxTimeToEvidenceHours,
    });

    const integrationsReport = (
      Object.keys(integrationArtifacts) as IntegrationName[]
    ).reduce(
      (acc, name) => {
        const { items } = integrationArtifacts[name];
        const averageDeliveryLagHours = items.length
          ? roundHours(
              items.reduce(
                (sum, artifact) => sum + artifact.deliveryLagHours,
                0,
              ) / items.length,
            )
          : 0;
        acc[name] = {
          name,
          artifacts: items,
          totalArtifacts: items.length,
          averageDeliveryLagHours,
        } satisfies IntegrationReport;
        return acc;
      },
      {} as Record<IntegrationName, IntegrationReport>,
    );

    const report: AfterActionReport = {
      scenarioName: this.scenario.name,
      startedAt: startDate.toISOString(),
      completedAt: lastCompletion.toISOString(),
      score,
      seed,
      metrics: {
        totalEvents: timeline.length,
        evidenceRequests,
        averageTimeToEvidenceHours,
        maxTimeToEvidenceHours,
        slaBreaches: breaches.length,
      },
      timeline,
      slaBreaches: breaches,
      integrations: integrationsReport,
    };

    return report;
  }

  private resolveActualHours(
    event: ResponseDrivenEvent,
    rng: SeededRandom,
  ): number {
    const jitter = rng.nextInRange(
      -event.variabilityHours,
      event.variabilityHours,
    );
    const raw = event.targetResponseHours + jitter;
    return raw < 0 ? 0 : raw;
  }

  private resolveSlaLimit(event: ResponseDrivenEvent): number {
    switch (event.type) {
      case 'regulator_query':
        return Math.min(
          event.dueInHours,
          this.scenario.slaTargets.regulatorResponseHours,
        );
      case 'customer_comm':
        return Math.min(
          event.dueInHours,
          this.scenario.slaTargets.customerNotificationHours,
        );
      case 'artifact_request':
        return Math.min(
          event.dueInHours,
          this.scenario.slaTargets.artifactFulfillmentHours,
        );
      default:
        return event.dueInHours;
    }
  }

  private buildRecommendation(
    event: ResponseDrivenEvent,
    gapHours: number,
  ): string {
    const roundedGap = roundHours(gapHours);
    switch (event.type) {
      case 'regulator_query':
        return `Assign a dedicated regulator liaison and pre-stage submissions to recover ${roundedGap}h.`;
      case 'customer_comm':
        return `Automate customer messaging approvals to shave ${roundedGap}h from the notification cycle.`;
      case 'artifact_request':
        return `Expand evidence automation for ${(event as ArtifactRequestEvent).artifactType} to claw back ${roundedGap}h of lag.`;
      default:
        return `Tighten playbook runbook to eliminate the ${roundedGap}h delay.`;
    }
  }

  private calculateScore({
    breaches,
    averageTimeToEvidenceHours,
    maxTimeToEvidenceHours,
  }: {
    breaches: SlaBreach[];
    averageTimeToEvidenceHours: number;
    maxTimeToEvidenceHours: number;
  }): number {
    const breachPenalty = breaches.length * 8;
    const averagePenalty = Math.max(
      0,
      averageTimeToEvidenceHours -
        this.scenario.slaTargets.artifactFulfillmentHours,
    );
    const maxPenalty = Math.max(
      0,
      maxTimeToEvidenceHours -
        this.scenario.slaTargets.artifactFulfillmentHours,
    );
    const rawScore =
      100 - breachPenalty - averagePenalty * 1.5 - maxPenalty * 0.5;
    return Math.max(0, roundHours(rawScore));
  }
}
