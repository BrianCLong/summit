import { Request } from './types.js';

export interface Credential {
  id: string;
  token: string;
  scope: string;
}

export interface CredentialBroker {
  getCredential(request: Request, scope: string): Promise<Credential>;
}

export class DisabledCredentialBroker implements CredentialBroker {
  async getCredential(request: Request, scope: string): Promise<Credential> {
    throw new Error('Credential brokering is disabled by default.');
  }
}
