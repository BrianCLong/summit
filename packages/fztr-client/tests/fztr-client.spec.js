"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
const axios_1 = __importDefault(require("axios"));
// Mock axios post and get
jest.mock('axios', () => ({
    post: jest.fn(() => Promise.resolve({ data: 'success' })),
    get: jest.fn((url) => {
        const id = url.split('/').pop();
        return Promise.resolve({ data: { id, issuer: 'mock-issuer', signature: 'mock-sig', payload: JSON.stringify({ data: `retrieved-data-for-${id}` }) } });
    }),
}));
describe('FZTRClient', () => {
    const relayUrl = 'http://localhost:7901';
    const clientId = 'test-client';
    const privateKey = 'test-key';
    let client;
    beforeEach(() => {
        client = new src_1.FZTRClient(relayUrl, clientId, privateKey);
    });
    test('should submit a credential', async () => {
        const id = 'cred-123';
        const payload = { message: 'hello' };
        const credential = await client.submitCredential(id, payload);
        expect(axios_1.default.post).toHaveBeenCalledWith(`${relayUrl}/relay/submit`, expect.any(Object));
        expect(credential.id).toBe(id);
        expect(credential.issuer).toBe(clientId);
        expect(credential.payload).toBe(JSON.stringify(payload));
    });
    test('should retrieve a credential', async () => {
        const id = 'cred-456';
        const credential = await client.retrieveCredential(id);
        expect(axios_1.default.get).toHaveBeenCalledWith(`${relayUrl}/relay/retrieve/${id}`);
        expect(credential.id).toBe(id);
        expect(credential.payload).toBe(JSON.stringify({ data: `retrieved-data-for-${id}` }));
    });
});
