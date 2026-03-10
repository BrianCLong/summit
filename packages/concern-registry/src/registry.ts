import * as fs from 'fs';
import * as path from 'path';
import { Concern } from './types';
import { normalizeConcern } from './normalize';

export class ConcernRegistry {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public register(concernInput: Partial<Concern>): Concern {
    const concern = normalizeConcern(concernInput);
    const filePath = path.join(this.baseDir, `${concern.concern_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(concern, null, 2));
    this.updateIndex();
    return concern;
  }

  public get(concern_id: string): Concern | null {
    const filePath = path.join(this.baseDir, `${concern_id}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
  }

  public getAll(): Concern[] {
    const files = fs.readdirSync(this.baseDir).filter(f => f.endsWith('.json') && f !== 'index.json');
    return files.map(f => this.get(f.replace('.json', '')) as Concern);
  }

  public updateIndex(): void {
    const concerns = this.getAll().sort((a, b) => a.concern_id.localeCompare(b.concern_id));
    const index = {
      concerns: concerns.map(c => ({
        concern_id: c.concern_id,
        path: `${c.concern_id}.json`
      }))
    };
    fs.writeFileSync(path.join(this.baseDir, 'index.json'), JSON.stringify(index, null, 2));
  }
}
