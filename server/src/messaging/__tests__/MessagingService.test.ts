import { MessagingService } from '../MessagingService.js';
import { jest } from '@jest/globals';

const mockCreate = jest.fn();
const mockGetHistory = jest.fn();

// @ts-ignore
jest.mock('../MessagingRepo.js', () => {
  return {
    MessagingRepo: jest.fn().mockImplementation(() => ({
      create: mockCreate,
      getHistory: mockGetHistory,
    })),
  };
});

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(() => {
    service = new MessagingService();
    // @ts-ignore
    service.setRepo({ create: mockCreate, getHistory: mockGetHistory });
    jest.clearAllMocks();
  });

  it('should send a message', async () => {
    // @ts-ignore
    mockCreate.mockResolvedValue({
        id: 'msg-1',
        senderId: 'user1',
        recipientId: 'user2',
        content: 'Hello there',
        createdAt: new Date(),
    });

    const result = await service.sendMessage({
      senderId: 'user1',
      recipientId: 'user2',
      content: 'Hello there',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('msg-1');
    expect(mockCreate).toHaveBeenCalled();
  });

  it('should get messages', async () => {
    // @ts-ignore
    mockGetHistory.mockResolvedValue([]);
    await service.getMessages('user1', 'user2');
    expect(mockGetHistory).toHaveBeenCalledWith('user1', 'user2');
  });
});
