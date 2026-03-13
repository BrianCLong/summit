import { SigningService } from './signing.js';

export interface CapabilityToken {
  pluginId: string;
  capabilities: string[];
  issuedAt: string;
  expiresAt: string;
  signature: string;
}

export class PluginContext {
  constructor(private signingService: SigningService) {}

  async issueCapabilityToken(
    pluginId: string,
    capabilities: string[],
    privateKey: string,
    expiryMs: number = 3600000 // 1 hour
  ): Promise<CapabilityToken> {
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + expiryMs).toISOString();

    const payload = JSON.stringify({ pluginId, capabilities, issuedAt, expiresAt });
    const signature = await this.signingService.sign(Buffer.from(payload), privateKey);

    return {
      pluginId,
      capabilities,
      issuedAt,
      expiresAt,
      signature,
    };
  }

  verifyToken(token: CapabilityToken, publicKey: string): boolean {
    const { signature, ...rest } = token;
    const payload = JSON.stringify(rest);

    const isExpired = new Date(token.expiresAt).getTime() < Date.now();
    if (isExpired) return false;

    return this.signingService.verify(Buffer.from(payload), signature, publicKey);
  }
}
