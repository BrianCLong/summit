"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NotificationService_js_1 = require("../NotificationService.js");
const types_js_1 = require("../types.js");
const globals_1 = require("@jest/globals");
// Mock getIO to avoid socket.io errors in tests
globals_1.jest.mock('../../realtime/socket.js', () => ({
    getIO: globals_1.jest.fn().mockReturnValue({
        of: globals_1.jest.fn().mockReturnValue({
            to: globals_1.jest.fn().mockReturnValue({
                emit: globals_1.jest.fn(),
            }),
        }),
    }),
}));
// Mock NotificationPreferenceRepo
const mockPreferenceRepo = {
    getPreferences: globals_1.jest.fn(),
    setPreferences: globals_1.jest.fn(),
};
// Mock NotificationRepo (used by InAppProvider)
// @ts-ignore
const mockCreate = globals_1.jest.fn();
// @ts-ignore
mockCreate.mockResolvedValue({ id: 'mock-notification-id' });
const mockGetUnread = globals_1.jest.fn();
const mockMarkAsRead = globals_1.jest.fn();
// @ts-ignore
globals_1.jest.mock('../repo/NotificationRepo.js', () => {
    return {
        NotificationRepo: globals_1.jest.fn().mockImplementation(() => ({
            create: mockCreate,
            getUnread: mockGetUnread,
            markAsRead: mockMarkAsRead,
        })),
    };
});
describe('NotificationService', () => {
    let service;
    beforeEach(() => {
        service = new NotificationService_js_1.NotificationService();
        service.setPreferenceRepo(mockPreferenceRepo);
        // @ts-ignore
        service.setNotificationRepo({ create: mockCreate, getUnread: mockGetUnread, markAsRead: mockMarkAsRead });
        globals_1.jest.clearAllMocks();
    });
    it('should send notification via specified channel', async () => {
        const result = await service.send({
            userId: 'user1',
            type: 'test',
            channels: [types_js_1.NotificationChannel.EMAIL], // EMAIL is using ConsoleProvider
            message: 'Hello World',
        });
        expect(result).toHaveLength(1);
        expect(result[0].channel).toBe(types_js_1.NotificationChannel.EMAIL);
        expect(result[0].success).toBe(true);
    });
    it('should use user preferences if no channels specified', async () => {
        mockPreferenceRepo.getPreferences.mockResolvedValue({
            userId: 'user1',
            channels: {
                [types_js_1.NotificationChannel.SMS]: true,
                [types_js_1.NotificationChannel.IN_APP]: false,
            },
        });
        const result = await service.send({
            userId: 'user1',
            type: 'test',
            message: 'Hello World',
        });
        expect(result).toHaveLength(1);
        expect(result[0].channel).toBe(types_js_1.NotificationChannel.SMS);
    });
    it('should render template correctly', async () => {
        const result = await service.send({
            userId: 'user1',
            type: 'welcome',
            templateId: 'welcome',
            data: { name: 'Brian' },
            channels: [types_js_1.NotificationChannel.EMAIL],
        });
        expect(result[0].success).toBe(true);
    });
    it('should fallback to IN_APP if no preferences and no channels', async () => {
        mockPreferenceRepo.getPreferences.mockResolvedValue(null);
        const result = await service.send({
            userId: 'user_new',
            type: 'test',
            message: 'Hello',
        });
        expect(result).toHaveLength(1);
        expect(result[0].channel).toBe(types_js_1.NotificationChannel.IN_APP);
    });
    it('should process digest if preferences allow', async () => {
        mockPreferenceRepo.getPreferences.mockResolvedValue({
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
        mockPreferenceRepo.getPreferences.mockResolvedValue({
            userId: 'user_no_digest',
            channels: {},
            digestFrequency: 'NONE'
        });
        const result = await service.processDigest('user_no_digest');
        expect(result).toBeUndefined();
    });
});
