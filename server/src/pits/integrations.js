"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultIntegrations = exports.IDTLStub = exports.IABStub = void 0;
function formatLag(hours) {
    return Math.round(hours * 100) / 100;
}
class BaseIntegration {
    name;
    constructor(name) {
        this.name = name;
    }
    buildUri(context, slug) {
        const datePart = context.fulfilledAt.toISOString().split('T')[0];
        return `evidence://${this.name.toLowerCase()}/${datePart}/${context.event.id}/${slug}`;
    }
    produceArtifact(context) {
        throw new Error('produceArtifact must be implemented by subclasses');
    }
}
class IABStub extends BaseIntegration {
    constructor() {
        super('IAB');
    }
    produceArtifact(context) {
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
exports.IABStub = IABStub;
class IDTLStub extends BaseIntegration {
    constructor() {
        super('IDTL');
    }
    produceArtifact(context) {
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
exports.IDTLStub = IDTLStub;
exports.defaultIntegrations = {
    IAB: new IABStub(),
    IDTL: new IDTLStub(),
};
