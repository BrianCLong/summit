import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { createHash } from 'crypto';

export interface VerifiableCredential {
  id: string;
  issuer: string;
  signature: string;
  payload: string; // JSON string of the actual data
}

export class FZTRRelay {
  private app: express.Application;
  private knownIssuers: Set<string>;

  constructor() {
    this.app = express();
    this.app.use(bodyParser.json({ limit: '1mb' }));
    this.knownIssuers = new Set(); // In a real system, this would be a more robust registry

    this.app.post('/relay/submit', this.handleSubmit.bind(this));
    this.app.get('/relay/retrieve/:id', this.handleRetrieve.bind(this));
  }

  registerIssuer(issuerId: string) {
    this.knownIssuers.add(issuerId);
  }

  verifyCredential(credential: VerifiableCredential): boolean {
    // Placeholder for actual cryptographic verification
    // Check issuer, signature, and payload integrity
    const payloadHash = createHash('sha256').update(credential.payload).digest('hex');
    return this.knownIssuers.has(credential.issuer) && credential.signature === `mock-sig-${payloadHash}`;
  }

  private handleSubmit(req: Request, res: Response) {
    const credential: VerifiableCredential = req.body;
    if (!this.verifyCredential(credential)) {
      return res.status(401).send('Invalid or unverified credential');
    }
    // In a real system, store the credential securely (e.g., IPFS, distributed ledger)
    // For MVP, we'll just acknowledge
    res.status(200).send({ message: 'Credential submitted', id: credential.id });
  }

  private handleRetrieve(req: Request, res: Response) {
    const { id } = req.params;
    // In a real system, retrieve the credential by ID
    // For MVP, return a mock credential
    const mockPayload = JSON.stringify({ data: `retrieved-data-for-${id}` });
    const mockHash = createHash('sha256').update(mockPayload).digest('hex');
    const mockCredential: VerifiableCredential = {
      id,
      issuer: 'mock-issuer',
      signature: `mock-sig-${mockHash}`,
      payload: mockPayload,
    };
    res.status(200).json(mockCredential);
  }

  start(port: number) {
    this.app.listen(port, () => {
      // console.log(`FZTR Relay listening on port ${port}`);
    });
  }
}

// Example usage (for a separate server process)
// const relay = new FZTRRelay();
// relay.registerIssuer('mock-issuer');
// relay.start(process.env.FZTR_RELAY_PORT ? parseInt(process.env.FZTR_RELAY_PORT) : 7901);
