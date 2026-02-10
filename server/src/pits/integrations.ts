import {
  IntegrationAdapter,
  IntegrationArtifact,
  IntegrationContext,
} from './types';

function formatLag(hours: number): number {
  return Math.round(hours * 100) / 100;
}

class BaseIntegration implements IntegrationAdapter {
  constructor(public readonly name: IntegrationAdapter['name']) {}

  protected buildUri(context: IntegrationContext, slug: string): string {
    const datePart = context.fulfilledAt.toISOString().split('T')[0];
    return `evidence://${this.name.toLowerCase()}/${datePart}/${context.event.id}/${slug}`;
  }


  produceArtifact(context: IntegrationContext): IntegrationArtifact {
    throw new Error('produceArtifact must be implemented by subclasses');
  }
}

export class IABStub extends BaseIntegration {
  constructor() {
    super('IAB');
  }

  produceArtifact(context: IntegrationContext): IntegrationArtifact {
    const sequenceLabel = context.sequence.toString().padStart(3, '0');
    const slug = `access-logs-${sequenceLabel}`;
    return {
      artifactId: `${this.name}-${context.seed}-${sequenceLabel}`,
      artifactType: context.event.artifactType,
      description: `Consolidated access control logs for ${context.event.evidenceDescription}`,
      generatedAt: context.fulfilledAt.toISOString(),
      deliveryLagHours: formatLag(context.responseHours),
      uri: this.buildUri(context, slug),
    };
  }
}

export class IDTLStub extends BaseIntegration {
  constructor() {
    super('IDTL');
  }

  produceArtifact(context: IntegrationContext): IntegrationArtifact {
    const sequenceLabel = context.sequence.toString().padStart(3, '0');
    const slug = `transfer-ledger-${sequenceLabel}`;
    return {
      artifactId: `${this.name}-${context.seed}-${sequenceLabel}`,
      artifactType: context.event.artifactType,
      description: `Data transfer ledger extract covering ${context.event.evidenceDescription}`,
      generatedAt: context.fulfilledAt.toISOString(),
      deliveryLagHours: formatLag(context.responseHours),
      uri: this.buildUri(context, slug),
    };
  }
}

export const defaultIntegrations: Record<
  IntegrationAdapter['name'],
  IntegrationAdapter
> = {
  IAB: new IABStub(),
  IDTL: new IDTLStub(),
};
