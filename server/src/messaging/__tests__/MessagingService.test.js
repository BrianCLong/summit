"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MessagingService_js_1 = require("../MessagingService.js");
const globals_1 = require("@jest/globals");
const mockCreate = globals_1.jest.fn();
const mockGetHistory = globals_1.jest.fn();
// @ts-ignore
globals_1.jest.mock('../MessagingRepo.js', () => {
    return {
        MessagingRepo: globals_1.jest.fn().mockImplementation(() => ({
            create: mockCreate,
            getHistory: mockGetHistory,
        })),
    };
});
describe('MessagingService', () => {
    let service;
    beforeEach(() => {
        service = new MessagingService_js_1.MessagingService();
        // @ts-ignore
        service.setRepo({ create: mockCreate, getHistory: mockGetHistory });
        globals_1.jest.clearAllMocks();
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
