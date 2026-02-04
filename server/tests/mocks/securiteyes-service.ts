// SecuriteyesService mock that works with Jest resetMocks: true
// Tests can call SecuriteyesService.getInstance.mockReturnValue() to override

// Default mock instance (used by getInstance by default)
export const mockSecuriteyesServiceInstance = {
  createNode: async (_label: string, data: any) => ({ id: 'mock-id', ...data }),
  createRelationship: async () => undefined,
  createSuspiciousEvent: async (data: any) => ({ id: 'event-id', ...data }),
  createIndicator: async (data: any) => ({ id: 'indicator-id', ...data }),
  createIncident: async (data: any) => ({ id: 'incident-id', ...data }),
  createCampaign: async (data: any) => ({ id: 'campaign-id', ...data }),
  createThreatActor: async (data: any) => ({ id: 'actor-id', ...data }),
  createDeceptionAsset: async (data: any) => ({ id: 'asset-id', ...data }),
  createInsiderRiskProfile: async (data: any) => ({ id: 'risk-id', ...data }),
  getNodeById: async () => null,
  getNodesByTenant: async () => [],
  updateNode: async (_label: string, _id: string, data: any) => ({ id: 'mock-id', ...data }),
  deleteNode: async () => true,
  linkIndicatorToEvent: async () => undefined,
  linkEventToIncident: async () => undefined,
  linkIncidentToCampaign: async () => undefined,
  correlateIndicators: async () => [],
  detectSimilarPatterns: async () => [],
  getRelatedEntities: async () => [],
  getThreatPath: async () => [],
  getIncidentTimeline: async () => [],
  calculateRiskScore: async () => ({ score: 0.5, factors: [] }),
  getHighRiskIndicators: async () => [],
  getThreatIntelligenceSummary: async () => ({ threats: 0, incidents: 0, indicators: 0 }),
};

// Custom mock function class that survives resetMocks
class StableMockFunction {
  private _calls: any[][] = [];
  private _returnValue: any = null;
  private _defaultImpl: (...args: any[]) => any;

  constructor(defaultImpl: (...args: any[]) => any) {
    this._defaultImpl = defaultImpl;
    // Create the actual callable function
    const fn = (...args: any[]) => {
      this._calls.push(args);
      return this._returnValue !== null ? this._returnValue : this._defaultImpl(...args);
    };
    // Attach mock methods
    (fn as any).mockReturnValue = (value: any) => {
      this._returnValue = value;
      return fn;
    };
    (fn as any).mockClear = () => {
      this._calls = [];
      return fn;
    };
    (fn as any).mockReset = () => {
      this._calls = [];
      this._returnValue = null;
      return fn;
    };
    (fn as any).mock = { calls: this._calls };
    return fn as any;
  }
}

// Singleton that maintains state
let instance: typeof mockSecuriteyesServiceInstance | null = null;

// Create getInstance as a stable mock function
const getInstanceFn = new StableMockFunction(() => {
  if (!instance) {
    instance = { ...mockSecuriteyesServiceInstance };
  }
  return instance;
});

export class SecuriteyesService {
  private static _instance: typeof mockSecuriteyesServiceInstance | null = null;

  // getInstance is a stable mock function that tests can call mockReturnValue on
  static getInstance = getInstanceFn as unknown as {
    (): typeof mockSecuriteyesServiceInstance;
    mockReturnValue: (value: any) => typeof getInstanceFn;
    mockClear: () => typeof getInstanceFn;
    mockReset: () => typeof getInstanceFn;
    mock: { calls: any[][] };
  };

  static resetInstance() {
    instance = null;
    SecuriteyesService._instance = null;
  }

  // Instance methods proxy to the singleton
  createNode = mockSecuriteyesServiceInstance.createNode;
  createRelationship = mockSecuriteyesServiceInstance.createRelationship;
  createSuspiciousEvent = mockSecuriteyesServiceInstance.createSuspiciousEvent;
  createIndicator = mockSecuriteyesServiceInstance.createIndicator;
  createIncident = mockSecuriteyesServiceInstance.createIncident;
  createCampaign = mockSecuriteyesServiceInstance.createCampaign;
  createThreatActor = mockSecuriteyesServiceInstance.createThreatActor;
  createDeceptionAsset = mockSecuriteyesServiceInstance.createDeceptionAsset;
  createInsiderRiskProfile = mockSecuriteyesServiceInstance.createInsiderRiskProfile;
  getNodeById = mockSecuriteyesServiceInstance.getNodeById;
  getNodesByTenant = mockSecuriteyesServiceInstance.getNodesByTenant;
  updateNode = mockSecuriteyesServiceInstance.updateNode;
  deleteNode = mockSecuriteyesServiceInstance.deleteNode;
  linkIndicatorToEvent = mockSecuriteyesServiceInstance.linkIndicatorToEvent;
  linkEventToIncident = mockSecuriteyesServiceInstance.linkEventToIncident;
  linkIncidentToCampaign = mockSecuriteyesServiceInstance.linkIncidentToCampaign;
  correlateIndicators = mockSecuriteyesServiceInstance.correlateIndicators;
  detectSimilarPatterns = mockSecuriteyesServiceInstance.detectSimilarPatterns;
  getRelatedEntities = mockSecuriteyesServiceInstance.getRelatedEntities;
  getThreatPath = mockSecuriteyesServiceInstance.getThreatPath;
  getIncidentTimeline = mockSecuriteyesServiceInstance.getIncidentTimeline;
  calculateRiskScore = mockSecuriteyesServiceInstance.calculateRiskScore;
  getHighRiskIndicators = mockSecuriteyesServiceInstance.getHighRiskIndicators;
  getThreatIntelligenceSummary = mockSecuriteyesServiceInstance.getThreatIntelligenceSummary;
}

export const mockService = mockSecuriteyesServiceInstance;

export default {
  SecuriteyesService,
  mockService,
  mockSecuriteyesServiceInstance,
};
