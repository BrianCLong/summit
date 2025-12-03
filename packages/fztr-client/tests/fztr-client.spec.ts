import { FZTRClient } from '../src';
import axios from 'axios';

// Mock axios post and get
jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({ data: 'success' })),
  get: jest.fn((url: string) => {
    const id = url.split('/').pop();
    return Promise.resolve({ data: { id, issuer: 'mock-issuer', signature: 'mock-sig', payload: JSON.stringify({ data: `retrieved-data-for-${id}` }) } });
  }),
}));

describe('FZTRClient', () => {
  const relayUrl = 'http://localhost:7901';
  const clientId = 'test-client';
  const privateKey = 'test-key';
  let client: FZTRClient;

  beforeEach(() => {
    client = new FZTRClient(relayUrl, clientId, privateKey);
  });

  test('should submit a credential', async () => {
    const id = 'cred-123';
    const payload = { message: 'hello' };
    const credential = await client.submitCredential(id, payload);

    expect(axios.post).toHaveBeenCalledWith(`${relayUrl}/relay/submit`, expect.any(Object));
    expect(credential.id).toBe(id);
    expect(credential.issuer).toBe(clientId);
    expect(credential.payload).toBe(JSON.stringify(payload));
  });

  test('should retrieve a credential', async () => {
    const id = 'cred-456';
    const credential = await client.retrieveCredential(id);

    expect(axios.get).toHaveBeenCalledWith(`${relayUrl}/relay/retrieve/${id}`);
    expect(credential.id).toBe(id);
    expect(credential.payload).toBe(JSON.stringify({ data: `retrieved-data-for-${id}` }));
  });
});