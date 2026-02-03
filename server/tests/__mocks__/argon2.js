import { jest } from '@jest/globals';

export const hash = jest.fn().mockResolvedValue('mocked_hash');
export const verify = jest.fn().mockResolvedValue(true);

const argon2 = { hash, verify };
export default argon2;
