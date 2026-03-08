"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const encryption_1 = require("../services/encryption");
// Mock Expo SecureStore
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
}));
describe('Encryption Service', () => {
    it('should encrypt and decrypt data correctly', async () => {
        const originalText = 'Sensitive Payload';
        const encrypted = await (0, encryption_1.encryptData)(originalText);
        const decrypted = await (0, encryption_1.decryptData)(encrypted);
        expect(encrypted).not.toBe(originalText);
        expect(decrypted).toBe(originalText);
    });
});
