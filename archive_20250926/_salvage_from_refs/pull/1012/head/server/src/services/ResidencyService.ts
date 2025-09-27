import fs from 'fs';
import path from 'path';

export class ResidencyService {
  private mapping: Record<string, string[]> = {};

  constructor(configPath = path.join(process.cwd(), 'config/residency/tenants.yaml')) {
    if (fs.existsSync(configPath)) {
      const text = fs.readFileSync(configPath, 'utf8');
      let current: string | null = null;
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        if (!line.startsWith(' ')) {
          current = line.replace(':', '').trim();
          this.mapping[current] = [];
        } else if (current) {
          this.mapping[current].push(line.trim().replace('- ', ''));
        }
      }
    }
  }

  allowedRegions(tenantId: string): string[] {
    return this.mapping[tenantId] || [];
  }
}
