import { v4 as uuidv4 } from "uuid";
import { Incident, IncidentStatus, IncidentSeverity } from "../models/incident";

// This is a placeholder for the actual receipt generation service.
// In a real implementation, this would call another service or library.
const generateProvenanceReceipt = (action: string, incidentId: string, details: object) => {
  console.log(`[Receipt] Action: ${action} on Incident: ${incidentId}`, details);
  // This would return a receipt ID or object
  return uuidv4();
};

// In-memory store for incidents, acting as a mock database.
const incidents: Incident[] = [];

export class IncidentService {
  /**
   * Creates a new incident.
   */
  public createIncident(
    data: Omit<Incident, "id" | "status" | "created_at" | "updated_at">
  ): Incident {
    const now = new Date().toISOString();
    const newIncident: Incident = {
      id: uuidv4(),
      status: "open",
      ...data,
      created_at: now,
      updated_at: now,
    };
    incidents.push(newIncident);

    generateProvenanceReceipt("incident_created", newIncident.id, { created: newIncident });
    return newIncident;
  }

  /**
   * Retrieves all incidents, with optional filtering.
   */
  public getIncidents(
    tenantId: string,
    filters: { tag?: string; status?: IncidentStatus; owner_id?: string }
  ): Incident[] {
    let filteredIncidents = incidents.filter((inc) => inc.tenant_id === tenantId);

    if (filters.tag) {
      filteredIncidents = filteredIncidents.filter((inc) => inc.tags.includes(filters.tag));
    }
    if (filters.status) {
      filteredIncidents = filteredIncidents.filter((inc) => inc.status === filters.status);
    }
    if (filters.owner_id) {
      filteredIncidents = filteredIncidents.filter((inc) => inc.owner_id === filters.owner_id);
    }

    return filteredIncidents;
  }

  /**
   * Retrieves a single incident by its ID.
   */
  public getIncidentById(id: string, tenantId: string): Incident | undefined {
    return incidents.find((inc) => inc.id === id && inc.tenant_id === tenantId);
  }

  /**
   * Updates an existing incident.
   */
  public updateIncident(
    id: string,
    tenantId: string,
    updates: Partial<Pick<Incident, "status" | "severity" | "owner_id" | "description" | "tags">>
  ): Incident | null {
    const incidentIndex = incidents.findIndex((inc) => inc.id === id && inc.tenant_id === tenantId);
    if (incidentIndex === -1) {
      return null;
    }

    const originalIncident = { ...incidents[incidentIndex] };
    const updatedIncident = {
      ...originalIncident,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Check for changes that require a receipt
    if (originalIncident.status !== updatedIncident.status) {
      generateProvenanceReceipt("status_changed", id, {
        from: originalIncident.status,
        to: updatedIncident.status,
      });
    }
    if (originalIncident.severity !== updatedIncident.severity) {
      generateProvenanceReceipt("severity_changed", id, {
        from: originalIncident.severity,
        to: updatedIncident.severity,
      });
    }
    if (originalIncident.owner_id !== updatedIncident.owner_id) {
      generateProvenanceReceipt("owner_changed", id, {
        from: originalIncident.owner_id,
        to: updatedIncident.owner_id,
      });
    }

    incidents[incidentIndex] = updatedIncident;
    return updatedIncident;
  }
}
