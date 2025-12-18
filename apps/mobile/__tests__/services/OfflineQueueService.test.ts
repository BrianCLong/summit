import {
  getPendingMutations,
  queueOfflineMutation,
  removePendingMutation,
  updateMutationRetry,
  shouldRetryMutation,
  getPendingCount,
  clearPendingMutations,
  isOnline,
} from '../../src/services/OfflineQueueService';
import NetInfo from '@react-native-community/netinfo';

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
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const result = await isOnline();

      expect(result).toBe(true);
    });

    it('returns false when not connected', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const result = await isOnline();

      expect(result).toBe(false);
    });

    it('returns false when internet not reachable', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: false,
      });

      const result = await isOnline();

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

      expect(shouldRetryMutation(mutation)).toBe(true);
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

      expect(shouldRetryMutation(mutation)).toBe(false);
    });
  });
});
