export class LegalCompliance {
  constructor() {
    this.obligations = new Map();
    this.incidentMatrix = new Map();
  }

  setObligations(tenantId, mappings) {
    this.obligations.set(tenantId, mappings);
  }

  mapIncidentChannel(type, contact) {
    this.incidentMatrix.set(type, contact);
  }

  getObligations(tenantId) {
    return this.obligations.get(tenantId) ?? [];
  }

  getIncidentContact(type) {
    return this.incidentMatrix.get(type);
  }
}
