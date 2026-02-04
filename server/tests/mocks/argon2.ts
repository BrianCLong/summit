import { jest } from '@jest/globals';

const mockArgon2 = {
    hash: jest.fn().mockResolvedValue('$argon2id$v=19$m=65536,t=3,p=4$628j...'),
    verify: jest.fn().mockResolvedValue(true),
};

export default mockArgon2;
export const hash = mockArgon2.hash;
export const verify = mockArgon2.verify;
