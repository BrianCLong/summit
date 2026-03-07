import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export interface EvidenceRecord {
  id: string;
  controlId: string;
  createdAt: Date;
  hash: string;
  signer: string;
  artifactPath: string;
  ttlDays: number;
  retentionDays: number;
  metadata?: Record<string, unknown>;
}

export class EvidenceStore {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async storeEvidence(
    controlId: string,
    content: Buffer | string,
    options: {
      signer: string;
      ttlDays: number;
      retentionDays: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<EvidenceRecord> {
    const controlDir = path.join(this.basePath, controlId);
    await fs.mkdir(controlDir, { recursive: true });

    const createdAt = new Date();
    const buffer = typeof content === "string" ? Buffer.from(content) : content;
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const id = `${createdAt.getTime()}-${hash.slice(0, 8)}`;
    const artifactPath = path.join(controlDir, `${id}.evidence`);

    try {
      await fs.writeFile(artifactPath, buffer, { flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error(`Evidence collision detected for control ${controlId}`);
      }
      throw error;
    }

    const record: EvidenceRecord = {
      id,
      controlId,
      createdAt,
      hash,
      signer: options.signer,
      artifactPath,
      ttlDays: options.ttlDays,
      retentionDays: options.retentionDays,
      metadata: options.metadata,
    };

    await this.appendIndex(controlDir, record);
    return record;
  }

  async listEvidence(controlId: string): Promise<EvidenceRecord[]> {
    const controlDir = path.join(this.basePath, controlId);
    try {
      const indexPath = path.join(controlDir, "index.json");
      const raw = await fs.readFile(indexPath, "utf-8");
      const parsed = JSON.parse(raw) as EvidenceRecord[];
      return parsed.map((entry) => ({ ...entry, createdAt: new Date(entry.createdAt) }));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async latest(controlId: string): Promise<EvidenceRecord | undefined> {
    const records = await this.listEvidence(controlId);
    return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  async purgeExpired(now: Date = new Date()): Promise<EvidenceRecord[]> {
    const removed: EvidenceRecord[] = [];
    const controlIds = await this.listControlIds();
    for (const controlId of controlIds) {
      const records = await this.listEvidence(controlId);
      const keep: EvidenceRecord[] = [];
      for (const record of records) {
        const expiry = new Date(record.createdAt);
        expiry.setDate(expiry.getDate() + record.retentionDays);
        if (expiry <= now) {
          await fs.rm(record.artifactPath, { force: true });
          removed.push(record);
        } else {
          keep.push(record);
        }
      }
      await this.writeIndex(path.join(this.basePath, controlId), keep);
    }
    return removed;
  }

  private async appendIndex(controlDir: string, record: EvidenceRecord): Promise<void> {
    const index = await this.listEvidence(path.basename(controlDir));
    index.push(record);
    await this.writeIndex(controlDir, index);
  }

  private async writeIndex(controlDir: string, records: EvidenceRecord[]): Promise<void> {
    await fs.mkdir(controlDir, { recursive: true });
    const serialized = JSON.stringify(records, null, 2);
    await fs.writeFile(path.join(controlDir, "index.json"), serialized);
  }

  private async listControlIds(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
}
