import axios from 'axios';
import { createHash } from 'crypto';

export interface VerifiableCredential {
  id: string;
  issuer: string;
  signature: string;
  payload: string; // JSON string of the actual data
}

export class FZTRClient {
  private relayUrl: string;
  private clientId: string;
  private privateKey: string; // In a real system, this would be a secure key management

  constructor(relayUrl: string, clientId: string, privateKey: string) {
    this.relayUrl = relayUrl;
    this.clientId = clientId;
    this.privateKey = privateKey;
  }

  async submitCredential(id: string, payload: unknown): Promise<VerifiableCredential> {
    const payloadString = JSON.stringify(payload);
    const payloadHash = createHash('sha256').update(payloadString).digest('hex');
    // Mock signature for MVP
    const signature = `mock-sig-${payloadHash}`;

    const credential: VerifiableCredential = {
      id,
      issuer: this.clientId,
      signature,
      payload: payloadString,
    };

    await axios.post(`${this.relayUrl}/relay/submit`, credential);
    return credential;
  }

  async retrieveCredential(id: string): Promise<VerifiableCredential> {
    const response = await axios.get(`${this.relayUrl}/relay/retrieve/${id}`);
    return response.data;
  }
}