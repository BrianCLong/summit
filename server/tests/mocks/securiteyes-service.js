"use strict";
// SecuriteyesService mock that works with Jest resetMocks: true
// Tests can call SecuriteyesService.getInstance.mockReturnValue() to override
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockService = exports.SecuriteyesService = exports.mockSecuriteyesServiceInstance = void 0;
// Default mock instance (used by getInstance by default)
exports.mockSecuriteyesServiceInstance = {
    createNode: async (_label, data) => ({ id: 'mock-id', ...data }),
    createRelationship: async () => undefined,
    createSuspiciousEvent: async (data) => ({ id: 'event-id', ...data }),
    createIndicator: async (data) => ({ id: 'indicator-id', ...data }),
    createIncident: async (data) => ({ id: 'incident-id', ...data }),
    createCampaign: async (data) => ({ id: 'campaign-id', ...data }),
    createThreatActor: async (data) => ({ id: 'actor-id', ...data }),
    createDeceptionAsset: async (data) => ({ id: 'asset-id', ...data }),
    createInsiderRiskProfile: async (data) => ({ id: 'risk-id', ...data }),
    getNodeById: async () => null,
    getNodesByTenant: async () => [],
    updateNode: async (_label, _id, data) => ({ id: 'mock-id', ...data }),
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
    _calls = [];
    _returnValue = null;
    _defaultImpl;
    constructor(defaultImpl) {
        this._defaultImpl = defaultImpl;
        // Create the actual callable function
        const fn = (...args) => {
            this._calls.push(args);
            return this._returnValue !== null ? this._returnValue : this._defaultImpl(...args);
        };
        // Attach mock methods
        fn.mockReturnValue = (value) => {
            this._returnValue = value;
            return fn;
        };
        fn.mockClear = () => {
            this._calls = [];
            return fn;
        };
        fn.mockReset = () => {
            this._calls = [];
            this._returnValue = null;
            return fn;
        };
        fn.mock = { calls: this._calls };
        return fn;
    }
}
// Singleton that maintains state
let instance = null;
// Create getInstance as a stable mock function
const getInstanceFn = new StableMockFunction(() => {
    if (!instance) {
        instance = { ...exports.mockSecuriteyesServiceInstance };
    }
    return instance;
});
class SecuriteyesService {
    static _instance = null;
    // getInstance is a stable mock function that tests can call mockReturnValue on
    static getInstance = getInstanceFn;
    static resetInstance() {
        instance = null;
        SecuriteyesService._instance = null;
    }
    // Instance methods proxy to the singleton
    createNode = exports.mockSecuriteyesServiceInstance.createNode;
    createRelationship = exports.mockSecuriteyesServiceInstance.createRelationship;
    createSuspiciousEvent = exports.mockSecuriteyesServiceInstance.createSuspiciousEvent;
    createIndicator = exports.mockSecuriteyesServiceInstance.createIndicator;
    createIncident = exports.mockSecuriteyesServiceInstance.createIncident;
    createCampaign = exports.mockSecuriteyesServiceInstance.createCampaign;
    createThreatActor = exports.mockSecuriteyesServiceInstance.createThreatActor;
    createDeceptionAsset = exports.mockSecuriteyesServiceInstance.createDeceptionAsset;
    createInsiderRiskProfile = exports.mockSecuriteyesServiceInstance.createInsiderRiskProfile;
    getNodeById = exports.mockSecuriteyesServiceInstance.getNodeById;
    getNodesByTenant = exports.mockSecuriteyesServiceInstance.getNodesByTenant;
    updateNode = exports.mockSecuriteyesServiceInstance.updateNode;
    deleteNode = exports.mockSecuriteyesServiceInstance.deleteNode;
    linkIndicatorToEvent = exports.mockSecuriteyesServiceInstance.linkIndicatorToEvent;
    linkEventToIncident = exports.mockSecuriteyesServiceInstance.linkEventToIncident;
    linkIncidentToCampaign = exports.mockSecuriteyesServiceInstance.linkIncidentToCampaign;
    correlateIndicators = exports.mockSecuriteyesServiceInstance.correlateIndicators;
    detectSimilarPatterns = exports.mockSecuriteyesServiceInstance.detectSimilarPatterns;
    getRelatedEntities = exports.mockSecuriteyesServiceInstance.getRelatedEntities;
    getThreatPath = exports.mockSecuriteyesServiceInstance.getThreatPath;
    getIncidentTimeline = exports.mockSecuriteyesServiceInstance.getIncidentTimeline;
    calculateRiskScore = exports.mockSecuriteyesServiceInstance.calculateRiskScore;
    getHighRiskIndicators = exports.mockSecuriteyesServiceInstance.getHighRiskIndicators;
    getThreatIntelligenceSummary = exports.mockSecuriteyesServiceInstance.getThreatIntelligenceSummary;
}
exports.SecuriteyesService = SecuriteyesService;
exports.mockService = exports.mockSecuriteyesServiceInstance;
exports.default = {
    SecuriteyesService,
    mockService: exports.mockService,
    mockSecuriteyesServiceInstance: exports.mockSecuriteyesServiceInstance,
};
