import { EpisodicExample, MemoryStore, MemoryQuery } from './memory_types';
import * as fs from 'fs';
import * as path from 'path';

export class EpisodicStore implements MemoryStore<EpisodicExample> {
  private entries: Map<string, EpisodicExample> = new Map();
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'memalign', 'episodic.json');
    this.load();
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        this.entries = new Map(data.map((e: EpisodicExample) => [e.id, e]));
      } catch (e) {
        console.error('Failed to load episodic store:', e);
        this.entries = new Map();
      }
    }
  }

  private save() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = Array.from(this.entries.values());
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async add(entry: EpisodicExample): Promise<void> {
    this.entries.set(entry.id, entry);
    this.save();
  }

  async retrieve(query: MemoryQuery): Promise<EpisodicExample[]> {
    // Naive implementation: text match on input
    const results = Array.from(this.entries.values()).filter(entry => {
      if (query.query) {
        return entry.input.toLowerCase().includes(query.query.toLowerCase());
      }
      return true;
    });
    return results.slice(0, query.limit || 5); // Fewer examples for few-shot
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
    this.save();
  }

  async list(): Promise<EpisodicExample[]> {
    return Array.from(this.entries.values());
  }

  async clear(): Promise<void> {
    this.entries.clear();
    this.save();
  }
}
