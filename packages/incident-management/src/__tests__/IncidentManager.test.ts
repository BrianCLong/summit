import { IncidentManager } from '../IncidentManager';

describe('IncidentManager', () => {
  let manager: IncidentManager;

  beforeEach(() => {
    // Reset singleton instance for testing if possible, but since it's private,
    // we might need to rely on fresh state or add a reset method.
    // For now, we just get the instance.
    manager = IncidentManager.getInstance();
  });

  test('should create an incident', () => {
    const incident = manager.createIncident('Test Incident', 'Something broke', 'SEV-3', 'user-123');
    expect(incident).toBeDefined();
    expect(incident.id).toContain('INC-');
    expect(incident.title).toBe('Test Incident');
    expect(incident.severity).toBe('SEV-3');
    expect(incident.state).toBe('SUSPECTED');
  });

  test('should update incident state', () => {
    const incident = manager.createIncident('State Test', 'Testing state transition', 'SEV-2');
    const updated = manager.updateState(incident.id, 'INVESTIGATING', 'user-456');

    expect(updated.state).toBe('INVESTIGATING');

    const events = manager.getTimeline(incident.id);
    expect(events.length).toBeGreaterThan(0);
    const lastEvent = events[events.length - 1];
    expect(lastEvent.type).toBe('STATUS_CHANGE');
    expect(lastEvent.data.newState).toBe('INVESTIGATING');
  });

  test('should trigger from alert and auto-create war room for SEV-1', () => {
      const incident = manager.triggerFromAlert('ALERT-001', { name: 'DB Down' }, 'SEV-1');

      expect(incident.severity).toBe('SEV-1');
      expect(incident.state).toBe('TRIAGE'); // Auto-promoted
      expect(incident.channelId).toBeDefined();
      expect(incident.channelId).toContain('war-room-');
  });

  test('should add artifacts', () => {
      const incident = manager.createIncident('Artifact Test', 'Testing artifacts', 'SEV-4');
      manager.addArtifact(incident.id, 'http://grafana.com/d/123', 'user-789');

      const updated = manager.getIncident(incident.id);
      expect(updated?.artifacts).toContain('http://grafana.com/d/123');
  });
});
