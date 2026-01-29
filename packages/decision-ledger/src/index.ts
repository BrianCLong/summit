import * as fs from 'fs';
import * as path from 'path';

export interface DecisionRecord {
  id: string;
  timestamp: string;
  agentId: string;
  policyVersion: string;
  inputHash: string;
  decision: any;
  reasoning: string;
  reverted: boolean;
}

export class DecisionLedger {
  private ledgerPath: string;

  constructor(ledgerPath: string) {
    this.ledgerPath = ledgerPath;
    if (!fs.existsSync(ledgerPath)) {
      fs.writeFileSync(ledgerPath, JSON.stringify([], null, 2));
    }
  }

  public record(decision: Omit<DecisionRecord, 'id' | 'timestamp' | 'reverted'>): DecisionRecord {
    const record: DecisionRecord = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      ...decision,
      reverted: false,
    };

    const ledger = this.readLedger();
    ledger.push(record);
    this.writeLedger(ledger);
    return record;
  }

  public replay(sinceTimestamp?: string): DecisionRecord[] {
    const ledger = this.readLedger();
    if (!sinceTimestamp) {
      return ledger;
    }
    return ledger.filter(r => r.timestamp >= sinceTimestamp);
  }

  public async rollback(decisionId: string, undoAction: (decision: DecisionRecord) => Promise<void>): Promise<void> {
    const ledger = this.readLedger();
    const recordIndex = ledger.findIndex(r => r.id === decisionId);

    if (recordIndex === -1) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    const record = ledger[recordIndex];
    if (record.reverted) {
      console.log(`Decision ${decisionId} already reverted`);
      return;
    }

    console.log(`Rolling back decision ${decisionId}: ${JSON.stringify(record.decision)}`);
    await undoAction(record);

    record.reverted = true;
    ledger[recordIndex] = record;
    this.writeLedger(ledger);
  }

  private readLedger(): DecisionRecord[] {
    const content = fs.readFileSync(this.ledgerPath, 'utf-8');
    try {
        return JSON.parse(content);
    } catch (e) {
        return [];
    }
  }

  private writeLedger(ledger: DecisionRecord[]): void {
    fs.writeFileSync(this.ledgerPath, JSON.stringify(ledger, null, 2));
  }
}
