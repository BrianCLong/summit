import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { edgeFleetService } from '../src/services/EdgeFleetService.js';

describe('Edge Assurance Operations', () => {
  let app: any;

  beforeAll(async () => {
    app = await createApp();
  });

  const agentManifest = {
    agentId: 'agent-007',
    version: '1.0.0',
    slsaLevel: 3,
    signature: 'valid-sig-123',
    capabilities: ['INFLUENCE_MAPPING']
  };

  const missionContext = {
    missionId: 'mission-alpha',
    type: 'INFLUENCE_MAPPING',
    target: 'region-x',
    authorizedBy: 'commander-shepard'
  };

  it('should register an agent with valid SLSA', async () => {
    const res = await request(app)
      .post('/api/edge/agents')
      .send(agentManifest);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should create and deploy a fleet in DENIED environment', async () => {
    // 1. Create Fleet
    const createRes = await request(app)
      .post('/api/edge/fleets')
      .send({
        agentIds: ['agent-007'],
        environment: 'DENIED'
      });

    expect(createRes.status).toBe(201);
    const fleetId = createRes.body.fleetId;
    expect(fleetId).toBeDefined();

    // 2. Deploy Fleet
    const deployRes = await request(app)
      .post(`/api/edge/fleets/${fleetId}/deploy`)
      .send({ missionContext });

    expect(deployRes.status).toBe(200);

    // 3. Record Activity (Buffered)
    const activityRes = await request(app)
      .post(`/api/edge/fleets/${fleetId}/activity`)
      .send({
        type: 'OUTPUT',
        content: 'Mapping influence nodes in sector 7'
      });

    expect(activityRes.status).toBe(200);

    // Verify buffering
    const fleet = edgeFleetService.getFleet(fleetId);
    expect(fleet?.logsBuffer.length).toBe(1);

    // 4. Sync Logs
    const syncRes = await request(app)
      .post(`/api/edge/fleets/${fleetId}/sync`);

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.syncedCount).toBe(1);

    // Verify buffer cleared
    expect(fleet?.logsBuffer.length).toBe(0);
  });
});
