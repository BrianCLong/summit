import * as fs from 'node:fs';
import * as path from 'node:path';
import { ActionReceipt, ActionReceiptSchema } from '../models/action-receipt.js';

export class ReceiptStore {
  private filePath: string;

  constructor(storagePath: string) {
    this.filePath = storagePath;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public append(receipt: ActionReceipt): void {
    const line = JSON.stringify(receipt) + '\n';
    fs.appendFileSync(this.filePath, line, 'utf8');
  }

  public list(): ActionReceipt[] {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }
    const content = fs.readFileSync(this.filePath, 'utf8');
    return content
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        try {
          const parsed = JSON.parse(line);
          return ActionReceiptSchema.parse(parsed);
        } catch (e) {
          console.error(`Failed to parse receipt line: ${line}`, e);
          return null;
        }
      })
      .filter((r): r is ActionReceipt => r !== null);
  }

  public getById(id: string): ActionReceipt | undefined {
    return this.list().find(r => r.id === id);
  }
}
