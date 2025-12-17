
import fs from 'fs';
import path from 'path';

export interface PersistenceAdapter<T> {
  save(key: string, data: T): Promise<void>;
  load(key: string): Promise<T | null>;
  list(): Promise<T[]>;
  delete(key: string): Promise<void>;
}

export class FilePersistenceAdapter<T> implements PersistenceAdapter<T> {
  private baseDir: string;

  constructor(collectionName: string) {
    this.baseDir = path.join(process.cwd(), 'server', 'data', 'governance', collectionName);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async save(key: string, data: T): Promise<void> {
    const filePath = path.join(this.baseDir, `${key}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async load(key: string): Promise<T | null> {
    const filePath = path.join(this.baseDir, `${key}.json`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (e) {
      return null;
    }
  }

  async list(): Promise<T[]> {
    const files = await fs.promises.readdir(this.baseDir);
    const results: T[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.promises.readFile(path.join(this.baseDir, file), 'utf-8');
        results.push(JSON.parse(content));
      }
    }
    return results;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, `${key}.json`);
    if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
    }
  }
}
