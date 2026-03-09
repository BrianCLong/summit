import { SemanticRule, MemoryStore, MemoryQuery } from './memory_types';
import * as fs from 'fs';
import * as path from 'path';

export class SemanticStore implements MemoryStore<SemanticRule> {
  private entries: Map<string, SemanticRule> = new Map();
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'memalign', 'semantic.json');
    this.load();
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        this.entries = new Map(data.map((e: SemanticRule) => [e.id, e]));
      } catch (e) {
        console.error('Failed to load semantic store:', e);
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

  async add(entry: SemanticRule): Promise<void> {
    this.entries.set(entry.id, entry);
    this.save();
  }

  async retrieve(query: MemoryQuery): Promise<SemanticRule[]> {
    const results = Array.from(this.entries.values()).filter(entry => {
      if (query.tags && query.tags.length > 0) {
        const entryTags = (entry.metadata.tags as string[]) || [];
        if (!query.tags.some(tag => entryTags.includes(tag))) return false;
      }
      if (query.query) {
        const q = query.query.toLowerCase();
        const c = entry.content.toLowerCase();
        // Simple token overlap
        const qTokens = q.split(/\s+/);
        const cTokens = c.split(/\s+/);
        // If any token from query (length > 3) is in content, it's a match
        return qTokens.some(t => t.length > 3 && c.includes(t));
      }
      return true;
    });
    return results.slice(0, query.limit || 10);
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
    this.save();
  }

  async list(): Promise<SemanticRule[]> {
    return Array.from(this.entries.values());
  }

  async clear(): Promise<void> {
    this.entries.clear();
    this.save();
  }
}
