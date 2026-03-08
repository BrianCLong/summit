"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const OfflineQueueService_1 = require("../../src/services/OfflineQueueService");
const netinfo_1 = __importDefault(require("@react-native-community/netinfo"));
jest.mock('react-native-mmkv');
jest.mock('@react-native-community/netinfo');
jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-1234',
}));
describe('OfflineQueueService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('isOnline', () => {
        it('returns true when connected and internet reachable', async () => {
            netinfo_1.default.fetch.mockResolvedValue({
                isConnected: true,
                isInternetReachable: true,
            });
            const result = await (0, OfflineQueueService_1.isOnline)();
            expect(result).toBe(true);
        });
        it('returns false when not connected', async () => {
            netinfo_1.default.fetch.mockResolvedValue({
                isConnected: false,
                isInternetReachable: false,
            });
            const result = await (0, OfflineQueueService_1.isOnline)();
            expect(result).toBe(false);
        });
        it('returns false when internet not reachable', async () => {
            netinfo_1.default.fetch.mockResolvedValue({
                isConnected: true,
                isInternetReachable: false,
            });
            const result = await (0, OfflineQueueService_1.isOnline)();
            expect(result).toBe(false);
        });
    });
    describe('shouldRetryMutation', () => {
        it('returns true when retry count is below max', () => {
            const mutation = {
                id: 'test-id',
                operationName: 'TestMutation',
                query: 'mutation Test { test }',
                variables: {},
                context: {},
                createdAt: new Date().toISOString(),
                retryCount: 0,
                priority: 0,
            };
            expect((0, OfflineQueueService_1.shouldRetryMutation)(mutation)).toBe(true);
        });
        it('returns false when retry count equals max', () => {
            const mutation = {
                id: 'test-id',
                operationName: 'TestMutation',
                query: 'mutation Test { test }',
                variables: {},
                context: {},
                createdAt: new Date().toISOString(),
                retryCount: 3, // Max retries from config
                priority: 0,
            };
            expect((0, OfflineQueueService_1.shouldRetryMutation)(mutation)).toBe(false);
        });
    });
});
