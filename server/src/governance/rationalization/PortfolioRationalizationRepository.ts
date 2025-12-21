import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RationalizationState } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STORE = path.resolve(__dirname, '../../../data/portfolio-rationalization.json');

async function ensureDirectoryExists(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

export class PortfolioRationalizationRepository {
  constructor(private readonly storePath: string = DEFAULT_STORE) {}

  async load(): Promise<RationalizationState> {
    await ensureDirectoryExists(this.storePath);
    try {
      const raw = await fs.readFile(this.storePath, 'utf-8');
      return JSON.parse(raw) as RationalizationState;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        const initial: RationalizationState = {
          modules: {},
          duplicateOutcomeAreas: [],
          compatModes: [],
          removalEvents: [],
        };
        await this.save(initial);
        return initial;
      }
      throw error;
    }
  }

  async save(state: RationalizationState): Promise<void> {
    await ensureDirectoryExists(this.storePath);
    const serialized = JSON.stringify(state, null, 2);
    await fs.writeFile(this.storePath, serialized, 'utf-8');
  }
}
