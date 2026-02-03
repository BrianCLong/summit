import { jest } from '@jest/globals';

// Define mock factory
const mockRepo = {
    getRfp: jest.fn(),
    getVendor: jest.fn(),
    createAgency: jest.fn(),
    createVendor: jest.fn(),
    createRfp: jest.fn(),
    createMatch: jest.fn(),
    getMatchesForRfp: jest.fn(),
    findVendorsByTags: jest.fn(),
    createAudit: jest.fn(),
    getLatestAudit: jest.fn(),
};

// unstable_mockModule must be called before import
// @ts-ignore
jest.unstable_mockModule('../../modules/factgov/repo.js', () => ({
  factGovRepo: mockRepo,
}));

describe('FactGov Resolvers', () => {
  let mockContext: any;
  let factGovResolvers: any;
  let factGovRepo: any;

  beforeAll(async () => {
    // Import module under test
    const resolverModule = await import('../../modules/factgov/resolvers.js');
    factGovResolvers = resolverModule.factGovResolvers;

    // Import mocked module to access mocks
    const repoModule = await import('../../modules/factgov/repo.js');
    factGovRepo = repoModule.factGovRepo;
  });

  beforeEach(() => {
    mockContext = {
      user: { id: 'test-user', roles: ['admin'] },
    };
    jest.clearAllMocks();
  });

  it('should create an agency', async () => {
    const mockAgency = { id: '1', name: 'Test Agency', domain: 'test.gov' };
    (mockRepo.createAgency as jest.Mock).mockResolvedValue(mockAgency);

    // @ts-ignore
    const result = await factGovResolvers.Mutation.factgovCreateAgency(
      null,
      { name: 'Test Agency', domain: 'test.gov' },
      mockContext
    );

    expect(result).toEqual(mockAgency);
    expect(mockRepo.createAgency).toHaveBeenCalledWith('Test Agency', 'test.gov');
  });

  it('should create a vendor', async () => {
      const mockVendor = { id: 'v1', name: 'Vendor Inc', tags: ['IT'] };
      (mockRepo.createVendor as jest.Mock).mockResolvedValue(mockVendor);

      // @ts-ignore
      const result = await factGovResolvers.Mutation.factgovCreateVendor(
          null,
          { name: 'Vendor Inc', tags: ['IT'], description: 'Tech' },
          mockContext
      );

      expect(result).toEqual(mockVendor);
      expect(mockRepo.createVendor).toHaveBeenCalledWith('Vendor Inc', ['IT'], 'Tech');
  });

  it('should match RFP', async () => {
    const mockRfp = { id: 'rfp-1', content: 'test rfp content matching tags' };
    const mockVendor = { id: 'vendor-1', tags: ['matching'] };
    const mockMatch = { id: 'match-1', rfpId: 'rfp-1', vendorId: 'vendor-1', score: 90 };

    (mockRepo.getRfp as jest.Mock).mockResolvedValue(mockRfp);
    (mockRepo.findVendorsByTags as jest.Mock).mockResolvedValue([mockVendor]);
    (mockRepo.createMatch as jest.Mock).mockResolvedValue(mockMatch);

    // @ts-ignore
    const result = await factGovResolvers.Mutation.factgovMatchRfp(null, { rfpId: 'rfp-1' }, mockContext);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockMatch);
  });

  it('should create RFP and audit', async () => {
    const mockRfp = { id: 'rfp-new', title: 'New RFP', content: 'Details' };
    const mockAudit = { id: 'audit-1', hash: 'abc' };

    (mockRepo.createRfp as jest.Mock).mockResolvedValue(mockRfp);
    (mockRepo.getLatestAudit as jest.Mock).mockResolvedValue(null);
    (mockRepo.createAudit as jest.Mock).mockResolvedValue(mockAudit);

    // @ts-ignore
    const result = await factGovResolvers.Mutation.factgovCreateRfp(
        null,
        { agencyId: 'a1', title: 'New RFP', content: 'Details' },
        mockContext
    );

    expect(result).toEqual(mockRfp);
    expect(mockRepo.createRfp).toHaveBeenCalledWith('a1', 'New RFP', 'Details');
    expect(mockRepo.createAudit).toHaveBeenCalled();
  });
});
