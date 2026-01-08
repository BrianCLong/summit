export class UXParityService {
  constructor() {
    this.workflows = new Map();
  }

  setWorkflows(tenantId, workflows) {
    this.workflows.set(tenantId, workflows);
  }

  getWorkflows(tenantId) {
    return this.workflows.get(tenantId) ?? [];
  }

  addCompatToggle(tenantId, workflow, expiresAt, notes) {
    const items = this.workflows.get(tenantId) ?? [];
    const existing = items.find((item) => item.workflow === workflow);
    const record = {
      workflow,
      status: "compat-mode",
      compatToggleExpiresAt: expiresAt,
      notes,
    };
    if (existing) {
      Object.assign(existing, record);
    } else {
      items.push(record);
    }
    this.workflows.set(tenantId, items);
    return record;
  }
}
