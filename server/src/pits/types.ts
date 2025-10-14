export type DrillEventType =
  | 'trigger'
  | 'fact'
  | 'regulator_query'
  | 'customer_comm'
  | 'artifact_request';

export type IntegrationName = 'IAB' | 'IDTL';

export interface BaseDrillEvent {
  id: string;
  type: DrillEventType;
  title: string;
  dayOffset: number;
  summary: string;
}

export interface TriggerEvent extends BaseDrillEvent {
  type: 'trigger';
  severity: 'low' | 'medium' | 'high';
}

export interface FactEvent extends BaseDrillEvent {
  type: 'fact';
  detail: string;
}

export interface ResponseDrivenEvent extends BaseDrillEvent {
  dueInHours: number;
  targetResponseHours: number;
  variabilityHours: number;
}

export interface RegulatorQueryEvent extends ResponseDrivenEvent {
  type: 'regulator_query';
  regulator: string;
  query: string;
}

export interface CustomerCommunicationEvent extends ResponseDrivenEvent {
  type: 'customer_comm';
  audience: string;
  channel: 'email' | 'status_page' | 'press_release' | 'in_app';
}

export interface ArtifactRequestEvent extends ResponseDrivenEvent {
  type: 'artifact_request';
  integration: IntegrationName;
  artifactType: string;
  evidenceDescription: string;
}

export type DrillEvent =
  | TriggerEvent
  | FactEvent
  | RegulatorQueryEvent
  | CustomerCommunicationEvent
  | ArtifactRequestEvent;

export interface DrillSlaTargets {
  regulatorResponseHours: number;
  customerNotificationHours: number;
  artifactFulfillmentHours: number;
}

export interface DrillScenario {
  name: string;
  description: string;
  startDate: Date;
  durationDays: number;
  events: DrillEvent[];
  slaTargets: DrillSlaTargets;
}

export interface IntegrationContext {
  scenario: DrillScenario;
  event: ArtifactRequestEvent;
  requestedAt: Date;
  fulfilledAt: Date;
  responseHours: number;
  seed: number;
  sequence: number;
}

export interface IntegrationArtifact {
  artifactId: string;
  artifactType: string;
  description: string;
  generatedAt: string;
  deliveryLagHours: number;
  uri: string;
}

export interface IntegrationAdapter {
  name: IntegrationName;
  produceArtifact(context: IntegrationContext): IntegrationArtifact;
}

export interface TimelineEntry {
  eventId: string;
  type: DrillEventType;
  title: string;
  scheduledAt: string;
  startedAt: string;
  completedAt: string;
  plannedHours?: number;
  actualHours?: number;
  status: 'informational' | 'on_track' | 'breached';
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface SlaBreach {
  eventId: string;
  eventTitle: string;
  eventType: DrillEventType;
  gapHours: number;
  recommendedAction: string;
}

export interface IntegrationReport {
  name: IntegrationName;
  artifacts: IntegrationArtifact[];
  totalArtifacts: number;
  averageDeliveryLagHours: number;
}

export interface AfterActionReport {
  scenarioName: string;
  startedAt: string;
  completedAt: string;
  score: number;
  seed: number;
  metrics: {
    totalEvents: number;
    evidenceRequests: number;
    averageTimeToEvidenceHours: number;
    maxTimeToEvidenceHours: number;
    slaBreaches: number;
  };
  timeline: TimelineEntry[];
  slaBreaches: SlaBreach[];
  integrations: Record<IntegrationName, IntegrationReport>;
}
