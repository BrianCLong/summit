import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class ExportService {
  private privateKey: string;
  public publicKey: string;

  constructor() {
      // Load or generate keypair
      const keyPath = path.resolve('private.pem');
      const pubPath = path.resolve('public.pem');

      if (fs.existsSync(keyPath) && fs.existsSync(pubPath)) {
          this.privateKey = fs.readFileSync(keyPath, 'utf8');
          this.publicKey = fs.readFileSync(pubPath, 'utf8');
      } else {
          // Generate new keypair
          const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp256k1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
          });
          this.privateKey = privateKey;
          this.publicKey = publicKey;

          // Save keys
          fs.writeFileSync(keyPath, this.privateKey);
          fs.writeFileSync(pubPath, this.publicKey);
      }
  }

  async createBundle(tenantId: string, data: any): Promise<{ bundlePath: string, manifest: any, signature: string }> {
    const bundleId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const content = JSON.stringify(data);
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    const manifest = {
        bundleId,
        tenantId,
        timestamp,
        contentHash,
        files: ['data.json']
    };

    const manifestStr = JSON.stringify(manifest);
    const signature = this.sign(manifestStr);

    const fullBundle = {
        manifest,
        signature,
        data
    };

    // Write to disk
    const outDir = path.resolve('exports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const filePath = path.join(outDir, `${bundleId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(fullBundle, null, 2));

    return { bundlePath: filePath, manifest, signature };
  }

  sign(data: string): string {
      const sign = crypto.createSign('SHA256');
      sign.update(data);
      sign.end();
      return sign.sign(this.privateKey, 'hex');
  }
}

export const exportService = new ExportService();
