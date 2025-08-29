export interface Signer {
  sign(payload: Buffer): Promise<Buffer>;
  verify(payload: Buffer, sig: Buffer): Promise<boolean>;
  kid(): string;
}

export class KmsSigner implements Signer {
  constructor(
    private keyId: string,
    private client: {
      sign: (id: string, data: Buffer) => Promise<Buffer>;
      verify: (id: string, data: Buffer, sig: Buffer) => Promise<boolean>;
    },
  ) {}
  sign(p: Buffer) {
    return this.client.sign(this.keyId, p);
  }
  verify(p: Buffer, s: Buffer) {
    return this.client.verify(this.keyId, p, s);
  }
  kid() {
    return this.keyId;
  }
}
