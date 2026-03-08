"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Define mock factory
const mockRepo = {
    getRfp: globals_1.jest.fn(),
    getVendor: globals_1.jest.fn(),
    createAgency: globals_1.jest.fn(),
    createVendor: globals_1.jest.fn(),
    createRfp: globals_1.jest.fn(),
    createMatch: globals_1.jest.fn(),
    getMatchesForRfp: globals_1.jest.fn(),
    findVendorsByTags: globals_1.jest.fn(),
    createAudit: globals_1.jest.fn(),
    getLatestAudit: globals_1.jest.fn(),
};
// unstable_mockModule must be called before import
// @ts-ignore
globals_1.jest.unstable_mockModule('../../modules/factgov/repo.js', () => ({
    factGovRepo: mockRepo,
}));
describe('FactGov Resolvers', () => {
    let mockContext;
    let factGovResolvers;
    let factGovRepo;
    beforeAll(async () => {
        // Import module under test
        const resolverModule = await Promise.resolve().then(() => __importStar(require('../../modules/factgov/resolvers.js')));
        factGovResolvers = resolverModule.factGovResolvers;
        // Import mocked module to access mocks
        const repoModule = await Promise.resolve().then(() => __importStar(require('../../modules/factgov/repo.js')));
        factGovRepo = repoModule.factGovRepo;
    });
    beforeEach(() => {
        mockContext = {
            user: { id: 'test-user', roles: ['admin'] },
        };
        globals_1.jest.clearAllMocks();
    });
    it('should create an agency', async () => {
        const mockAgency = { id: '1', name: 'Test Agency', domain: 'test.gov' };
        mockRepo.createAgency.mockResolvedValue(mockAgency);
        // @ts-ignore
        const result = await factGovResolvers.Mutation.factgovCreateAgency(null, { name: 'Test Agency', domain: 'test.gov' }, mockContext);
        expect(result).toEqual(mockAgency);
        expect(mockRepo.createAgency).toHaveBeenCalledWith('Test Agency', 'test.gov');
    });
    it('should create a vendor', async () => {
        const mockVendor = { id: 'v1', name: 'Vendor Inc', tags: ['IT'] };
        mockRepo.createVendor.mockResolvedValue(mockVendor);
        // @ts-ignore
        const result = await factGovResolvers.Mutation.factgovCreateVendor(null, { name: 'Vendor Inc', tags: ['IT'], description: 'Tech' }, mockContext);
        expect(result).toEqual(mockVendor);
        expect(mockRepo.createVendor).toHaveBeenCalledWith('Vendor Inc', ['IT'], 'Tech');
    });
    it('should match RFP', async () => {
        const mockRfp = { id: 'rfp-1', content: 'test rfp content matching tags' };
        const mockVendor = { id: 'vendor-1', tags: ['matching'] };
        const mockMatch = { id: 'match-1', rfpId: 'rfp-1', vendorId: 'vendor-1', score: 90 };
        mockRepo.getRfp.mockResolvedValue(mockRfp);
        mockRepo.findVendorsByTags.mockResolvedValue([mockVendor]);
        mockRepo.createMatch.mockResolvedValue(mockMatch);
        // @ts-ignore
        const result = await factGovResolvers.Mutation.factgovMatchRfp(null, { rfpId: 'rfp-1' }, mockContext);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockMatch);
    });
    it('should create RFP and audit', async () => {
        const mockRfp = { id: 'rfp-new', title: 'New RFP', content: 'Details' };
        const mockAudit = { id: 'audit-1', hash: 'abc' };
        mockRepo.createRfp.mockResolvedValue(mockRfp);
        mockRepo.getLatestAudit.mockResolvedValue(null);
        mockRepo.createAudit.mockResolvedValue(mockAudit);
        // @ts-ignore
        const result = await factGovResolvers.Mutation.factgovCreateRfp(null, { agencyId: 'a1', title: 'New RFP', content: 'Details' }, mockContext);
        expect(result).toEqual(mockRfp);
        expect(mockRepo.createRfp).toHaveBeenCalledWith('a1', 'New RFP', 'Details');
        expect(mockRepo.createAudit).toHaveBeenCalled();
    });
});
