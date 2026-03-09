import { LedgerEvent } from './event-schema.js';
import * as fs from 'fs';
import * as path from 'path';

export class LedgerStore {
    private events: LedgerEvent[] = [];
    private logFile: string;

    constructor(logFilePath: string = 'artifacts/ledger/event-log.ndjson') {
        this.logFile = logFilePath;
        // Ensure directory exists
        const dir = path.dirname(this.logFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    public append(event: LedgerEvent): void {
        this.events.push(event);
        fs.appendFileSync(this.logFile, JSON.stringify(event) + '\n');
    }

    public getEvents(): LedgerEvent[] {
        return [...this.events];
    }

    public clear(): void {
        this.events = [];
        if (fs.existsSync(this.logFile)) {
             fs.unlinkSync(this.logFile);
        }
    }
}
