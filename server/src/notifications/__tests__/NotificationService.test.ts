import { NotificationService } from '../NotificationService.js';
import { NotificationChannel, NotificationPriority } from '../types.js';
import { jest } from '@jest/globals';

// Mock getIO to avoid socket.io errors in tests
jest.mock('../../realtime/socket.js', () => ({
  getIO: jest.fn().mockReturnValue({
    of: jest.fn().mockReturnValue({
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    }),
  }),
}));

// Mock NotificationPreferenceRepo
const mockPreferenceRepo = {
  getPreferences: jest.fn(),
  setPreferences: jest.fn(),
};

// Mock NotificationRepo (used by InAppProvider)
// @ts-ignore
const mockCreate = jest.fn();
// @ts-ignore
mockCreate.mockResolvedValue({ id: 'mock-notification-id' });

const mockGetUnread = jest.fn();
const mockMarkAsRead = jest.fn();

// @ts-ignore
jest.mock('../repo/NotificationRepo.js', () => {
  return {
    NotificationRepo: jest.fn().mockImplementation(() => ({
      create: mockCreate,
      getUnread: mockGetUnread,
      markAsRead: mockMarkAsRead,
    })),
  };
});

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    service.setPreferenceRepo(mockPreferenceRepo as any);
    // @ts-ignore
    service.setNotificationRepo({ create: mockCreate, getUnread: mockGetUnread, markAsRead: mockMarkAsRead });
    jest.clearAllMocks();
  });

  it('should send notification via specified channel', async () => {
    const result = await service.send({
      userId: 'user1',
      type: 'test',
      channels: [NotificationChannel.EMAIL], // EMAIL is using ConsoleProvider
      message: 'Hello World',
    });

    expect(result).toHaveLength(1);
    expect(result[0].channel).toBe(NotificationChannel.EMAIL);
    expect(result[0].success).toBe(true);
  });

  it('should use user preferences if no channels specified', async () => {
    (mockPreferenceRepo.getPreferences as any).mockResolvedValue({
      userId: 'user1',
      channels: {
        [NotificationChannel.SMS]: true,
        [NotificationChannel.IN_APP]: false,
      },
    });

    const result = await service.send({
      userId: 'user1',
      type: 'test',
      message: 'Hello World',
    });

    expect(result).toHaveLength(1);
    expect(result[0].channel).toBe(NotificationChannel.SMS);
  });

  it('should render template correctly', async () => {
    const result = await service.send({
      userId: 'user1',
      type: 'welcome',
      templateId: 'welcome',
      data: { name: 'Brian' },
      channels: [NotificationChannel.EMAIL],
    });

    expect(result[0].success).toBe(true);
  });

  it('should fallback to IN_APP if no preferences and no channels', async () => {
    (mockPreferenceRepo.getPreferences as any).mockResolvedValue(null);

    const result = await service.send({
      userId: 'user_new',
      type: 'test',
      message: 'Hello',
    });

    expect(result).toHaveLength(1);
    expect(result[0].channel).toBe(NotificationChannel.IN_APP);
  });

  it('should process digest if preferences allow', async () => {
    (mockPreferenceRepo.getPreferences as any).mockResolvedValue({
        userId: 'user_digest',
        channels: {},
        digestFrequency: 'DAILY'
    });

    // @ts-ignore
    mockGetUnread.mockResolvedValue([
        { id: '1', subject: 'Test 1' },
        { id: '2', subject: 'Test 2' }
    ]);

    const result = await service.processDigest('user_digest');
    expect(result).toBe(true);
    expect(mockGetUnread).toHaveBeenCalledWith('user_digest');
    expect(mockMarkAsRead).toHaveBeenCalledTimes(2);
  });

  it('should not process digest if preferences disable it', async () => {
    (mockPreferenceRepo.getPreferences as any).mockResolvedValue({
        userId: 'user_no_digest',
        channels: {},
        digestFrequency: 'NONE'
    });

    const result = await service.processDigest('user_no_digest');
    expect(result).toBeUndefined();
  });
});
