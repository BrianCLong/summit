import { KPI } from './types.js';
import { MaestroEvent } from '@intelgraph/maestro-core';
import { Incident } from '@intelgraph/securiteyes';

export class MetricsEngine {
  private events: MaestroEvent[] = [];
  private incidents: Incident[] = [];

  ingestMaestroEvent(event: MaestroEvent) {
    this.events.push(event);
  }

  ingestIncident(incident: Incident) {
    this.incidents.push(incident);
  }

  computeTaskSuccessRate(): KPI {
    const completed = this.events.filter(e => e.type === 'TASK_COMPLETED').length;
    const total = this.events.filter(e => e.type === 'TASK_STARTED').length;

    return {
      id: 'kpi-task-success',
      name: 'Task Success Rate',
      value: total === 0 ? 0 : (completed / total) * 100,
      unit: 'PERCENT',
      timestamp: new Date()
    };
  }

  computeGovernanceBlockRate(): KPI {
    const blocked = this.events.filter(e => e.type === 'TASK_BLOCKED').length;
    const total = this.events.filter(e => e.type === 'TASK_CREATED' || e.type === 'TASK_BLOCKED').length; // approximation

    return {
      id: 'kpi-gov-block',
      name: 'Governance Block Rate',
      value: total === 0 ? 0 : (blocked / total) * 100,
      unit: 'PERCENT',
      timestamp: new Date()
    };
  }

  computeIncidentVelocity(): KPI {
    // Incidents per minute? Just returning count for now.
    return {
      id: 'kpi-incident-count',
      name: 'Total Incidents',
      value: this.incidents.length,
      unit: 'COUNT',
      timestamp: new Date()
    };
  }
}
