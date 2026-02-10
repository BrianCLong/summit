import { incidentService } from '../IncidentService.js';
import { getPostgresPool } from '../../db/postgres.js';
import { provenanceLedger } from '../../provenance/ledger.js';

jest.mock('../../db/postgres.js');
jest.mock('../../provenance/ledger.js');

describe('IncidentService', () => {
  let mockPool: any;
  let mockLedger: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);

    mockLedger = {
      appendEntry: jest.fn(),
    };
    (provenanceLedger as any).appendEntry = mockLedger.appendEntry;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an incident', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // create table check 1
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // create table check 2
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'inc-123' }] }); // insert incident

    await incidentService.createIncident({
      tenantId: 'tenant-1',
      title: 'Test Incident',
      description: 'Test Description',
      severity: 'high',
      userId: 'user-1'
    });

    expect(mockPool.query).toHaveBeenCalledTimes(3); // 2 schema checks + 1 insert
    expect(mockLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'INCIDENT_CREATED',
        resourceId: expect.any(String),
        actorId: 'user-1'
    }));
  });
});
