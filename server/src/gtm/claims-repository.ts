import { promises as fs } from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import { Claim } from './types.js';

const DEFAULT_BASE_PATH = path.resolve(process.cwd(), 'docs/gtm/claims');

export class ClaimsRepository {
  private claimsPath: string;
  private csvPath: string;

  constructor(basePath: string = DEFAULT_BASE_PATH) {
    this.claimsPath = path.join(basePath, 'claims.json');
    this.csvPath = path.join(basePath, 'claims.csv');
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.claimsPath), { recursive: true });
    try {
      await fs.access(this.claimsPath);
    } catch {
      await this.saveClaims([]);
    }
  }

  async loadClaims(): Promise<Claim[]> {
    await this.init();
    const raw = await fs.readFile(this.claimsPath, 'utf8');
    const claims = JSON.parse(raw) as Claim[];
    return claims.map((claim) => ({ ...claim, channels: [...new Set(claim.channels)] }));
  }

  async saveClaims(claims: Claim[]): Promise<void> {
    await fs.mkdir(path.dirname(this.claimsPath), { recursive: true });
    await fs.writeFile(this.claimsPath, JSON.stringify(claims, null, 2));
    await this.writeCsv(claims);
  }

  async upsertClaim(updated: Claim): Promise<void> {
    const claims = await this.loadClaims();
    const existingIndex = claims.findIndex((claim) => claim.claimId === updated.claimId);
    if (existingIndex >= 0) {
      claims[existingIndex] = updated;
    } else {
      claims.push(updated);
    }
    await this.saveClaims(claims.sort((a, b) => a.claimId.localeCompare(b.claimId)));
  }

  async writeCsv(claims: Claim[]): Promise<void> {
    const parser = new Parser({
      fields: [
        'claimId',
        'message',
        'evidenceType',
        'evidenceSource',
        'status',
        'reviewDate',
        'owner',
        'channels',
        'riskTier',
        'expiry',
        'publishedAt',
        'forwardLooking',
        'complianceSurface',
      ],
    });
    const csv = parser.parse(
      claims.map((claim) => ({
        ...claim,
        channels: claim.channels.join('|'),
        complianceSurface: claim.complianceSurface?.join('|'),
      })),
    );
    await fs.writeFile(this.csvPath, csv);
  }
}
