import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { MutableRevocationRegistry } from './types.js';

export class InMemoryRevocationRegistry implements MutableRevocationRegistry {
  protected revoked = new Set<string>();

  constructor(initial: Iterable<string> = []) {
    for (const id of initial) {
      this.revoked.add(id);
    }
  }

  async isRevoked(credentialId: string): Promise<boolean> {
    return this.revoked.has(credentialId);
  }

  async revoke(credentialId: string): Promise<void> {
    this.revoked.add(credentialId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.revoked);
  }
}

export class FileRevocationRegistry extends InMemoryRevocationRegistry {
  constructor(private readonly filePath: string) {
    super();
  }

  override async isRevoked(credentialId: string): Promise<boolean> {
    await this.load();
    return super.isRevoked(credentialId);
  }

  override async revoke(credentialId: string): Promise<void> {
    await this.load();
    await super.revoke(credentialId);
    await this.persist();
  }

  override async list(): Promise<string[]> {
    await this.load();
    return super.list();
  }

  private async load(): Promise<void> {
    try {
      const contents = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(contents);
      if (Array.isArray(parsed.revoked)) {
        this.revoked = new Set(parsed.revoked);
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const data = JSON.stringify({ revoked: await super.list() }, null, 2);
    await fs.writeFile(this.filePath, data, 'utf8');
  }
}
