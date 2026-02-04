import { jest } from '@jest/globals';
export const rateLimitAndCachePlugin = jest.fn().mockReturnValue({
    requestDidStart: jest.fn().mockResolvedValue({}),
});
