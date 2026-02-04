import { jest } from '@jest/globals';

const mockIntelGraphInstance = {
  query: jest.fn().mockResolvedValue({ records: [] }),
  createEntity: jest.fn().mockResolvedValue({ id: 'mock-entity-id' }),
  updateEntity: jest.fn().mockResolvedValue({ id: 'mock-entity-id' }),
  deleteEntity: jest.fn().mockResolvedValue(true),
  createRelationship: jest.fn().mockResolvedValue({ id: 'mock-rel-id' }),
  search: jest.fn().mockResolvedValue([]),
  getEntity: jest.fn().mockResolvedValue(null),
  getRelationships: jest.fn().mockResolvedValue([]),
  runCypher: jest.fn().mockResolvedValue({ records: [] }),
  close: jest.fn().mockResolvedValue(undefined as never),
};

export class IntelGraphService {
  static instance: IntelGraphService | null = null;

  static getInstance = jest.fn(() => {
    if (!IntelGraphService.instance) {
      IntelGraphService.instance = new IntelGraphService();
    }
    return IntelGraphService.instance;
  });

  static resetInstance = jest.fn(() => {
    IntelGraphService.instance = null;
  });

  query = jest.fn().mockResolvedValue({ records: [] });
  createEntity = jest.fn().mockResolvedValue({ id: 'mock-entity-id' });
  updateEntity = jest.fn().mockResolvedValue({ id: 'mock-entity-id' });
  deleteEntity = jest.fn().mockResolvedValue(true);
  createRelationship = jest.fn().mockResolvedValue({ id: 'mock-rel-id' });
  search = jest.fn().mockResolvedValue([]);
  getEntity = jest.fn().mockResolvedValue(null);
  getRelationships = jest.fn().mockResolvedValue([]);
  runCypher = jest.fn().mockResolvedValue({ records: [] });
  close = jest.fn().mockResolvedValue(undefined as never);
}

export const getInstance = IntelGraphService.getInstance;
export default IntelGraphService;
