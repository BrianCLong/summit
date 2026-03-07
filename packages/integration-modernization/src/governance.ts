import { ConnectorMetadata, SchemaDefinition } from "./types";

export type DeprecationEntry = {
  connectorId: string;
  reason: string;
  sunsetAt: number;
};

export type ReleaseNote = {
  connectorId: string;
  message: string;
  publishedAt: number;
};

export class Governance {
  private ownership: Map<string, ConnectorMetadata> = new Map();
  private deprecations: DeprecationEntry[] = [];
  private releaseNotes: ReleaseNote[] = [];
  private compatibilityAnnouncements: {
    name: string;
    from: SchemaDefinition;
    to: SchemaDefinition;
  }[] = [];

  registerConnector(metadata: ConnectorMetadata) {
    this.ownership.set(metadata.id, metadata);
  }

  ownershipAudit() {
    return [...this.ownership.values()].map((metadata) => ({
      id: metadata.id,
      owner: metadata.owner,
      sla: metadata.contract.versioning.current,
      contractVersion: metadata.contract.versioning.current,
      healthModel: metadata.contract.errors,
    }));
  }

  markDeprecated(entry: DeprecationEntry) {
    this.deprecations.push(entry);
  }

  deprecationSlate() {
    return [...this.deprecations];
  }

  addReleaseNote(note: ReleaseNote) {
    this.releaseNotes.push(note);
  }

  notesFor(connectorId: string) {
    return this.releaseNotes.filter((note) => note.connectorId === connectorId);
  }

  contractChangeWorkflow(name: string, from: SchemaDefinition, to: SchemaDefinition) {
    const missing = from.requiredFields.filter((field) => !to.requiredFields.includes(field));
    if (missing.length) throw new Error("Backward incompatible change");
    this.compatibilityAnnouncements.push({ name, from, to });
  }

  reviews() {
    return {
      connectors: this.ownership.size,
      deprecated: this.deprecations.length,
      releaseNotes: this.releaseNotes.length,
      pendingCompatibility: this.compatibilityAnnouncements.length,
    };
  }
}
