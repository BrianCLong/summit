import { describe, it, expect, beforeEach, jest } from '@jest/globals';
// @ts-ignore
const VisualizationService = require('../../src/services/VisualizationService');

describe('VisualizationService', () => {
  let service: any;
  let mockSession: any;
  let mockDriver: any;

  beforeEach(() => {
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
    };
    service = new VisualizationService(mockDriver, {}, {}, { info: jest.fn(), error: jest.fn(), warn: jest.fn() });
  });

  it('should initialize with default types', () => {
    const types = service.getAvailableTypes();
    expect(types.length).toBeGreaterThan(0);
    expect(types.find((t: any) => t.id === 'NETWORK_GRAPH')).toBeDefined();
  });

  it('createVisualization should return visualization object', async () => {
    const request = {
      type: 'NETWORK_GRAPH',
      userId: 'user-1',
      parameters: { investigationId: 'inv-1' }
    };

    const viz = await service.createVisualization(request);

    expect(viz).toBeDefined();
    expect(viz.id).toBeDefined();
    expect(viz.status).toBe('COMPLETED');
    expect(mockDriver.session).toHaveBeenCalled();
    expect(mockSession.run).toHaveBeenCalled();
  });

  it('exportVisualization should return export data', async () => {
    // First create one
    const viz = await service.createVisualization({
      type: 'NETWORK_GRAPH',
      userId: 'user-1',
      parameters: { investigationId: 'inv-1' }
    });

    const exportData = await service.exportVisualization(viz.id, 'json');
    expect(exportData.status).toBe('COMPLETED');
    expect(exportData.json).toBeDefined();
  });
});
