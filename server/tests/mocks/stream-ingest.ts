import { jest } from '@jest/globals';
export const streamIngest = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
};
