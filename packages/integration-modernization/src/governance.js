"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Governance = void 0;
class Governance {
    ownership = new Map();
    deprecations = [];
    releaseNotes = [];
    compatibilityAnnouncements = [];
    registerConnector(metadata) {
        this.ownership.set(metadata.id, metadata);
    }
    ownershipAudit() {
        return [...this.ownership.values()].map((metadata) => ({
            id: metadata.id,
            owner: metadata.owner,
            sla: metadata.contract.versioning.current,
            contractVersion: metadata.contract.versioning.current,
            healthModel: metadata.contract.errors
        }));
    }
    markDeprecated(entry) {
        this.deprecations.push(entry);
    }
    deprecationSlate() {
        return [...this.deprecations];
    }
    addReleaseNote(note) {
        this.releaseNotes.push(note);
    }
    notesFor(connectorId) {
        return this.releaseNotes.filter((note) => note.connectorId === connectorId);
    }
    contractChangeWorkflow(name, from, to) {
        const missing = from.requiredFields.filter((field) => !to.requiredFields.includes(field));
        if (missing.length)
            throw new Error('Backward incompatible change');
        this.compatibilityAnnouncements.push({ name, from, to });
    }
    reviews() {
        return {
            connectors: this.ownership.size,
            deprecated: this.deprecations.length,
            releaseNotes: this.releaseNotes.length,
            pendingCompatibility: this.compatibilityAnnouncements.length
        };
    }
}
exports.Governance = Governance;
