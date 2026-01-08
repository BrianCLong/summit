import { encryptData, decryptData } from "../services/encryption";

// Mock Expo SecureStore
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

describe("Encryption Service", () => {
  it("should encrypt and decrypt data correctly", async () => {
    const originalText = "Sensitive Payload";
    const encrypted = await encryptData(originalText);
    const decrypted = await decryptData(encrypted);

    expect(encrypted).not.toBe(originalText);
    expect(decrypted).toBe(originalText);
  });
});
