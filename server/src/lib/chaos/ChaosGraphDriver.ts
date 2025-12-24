import { Driver, Session, Transaction } from 'neo4j-driver';
import { ChaosHarness } from './harness.js';

// Neo4j 4.x/5.x type compatibility wrapper
type TransactionConfig = any;
type SessionConfig = Parameters<Driver['session']>[0];
type QueryResult = Awaited<ReturnType<Session['run']>>;

export class ChaosGraphDriver {
    private driver: Driver;
    private targetName: string;

    constructor(driver: Driver, targetName: string = 'graph-driver') {
        this.driver = driver;
        this.targetName = targetName;
    }

    public session(config?: SessionConfig): Session {
        const session = this.driver.session(config);
        return new ChaosSession(session, this.targetName) as unknown as Session;
    }

    public close(): Promise<void> {
        return this.driver.close();
    }
}

class ChaosSession {
    private realSession: Session;
    private targetName: string;

    constructor(session: Session, targetName: string) {
        this.realSession = session;
        this.targetName = targetName;
    }

    public async run(query: string, parameters?: any, config?: TransactionConfig): Promise<QueryResult> {
        const harness = ChaosHarness.getInstance();

        // Latency injection
        await harness.delay(this.targetName);

        // Error injection
        if (harness.shouldFail(this.targetName)) {
             const chaosConfig = harness.getConfig(this.targetName);
             const errorType = chaosConfig.errorType || 'ServiceUnavailable'; // Default neo4j error

             throw new Error(`Chaos injected Neo4j error: ${errorType}`);
        }

        return this.realSession.run(query, parameters, config);
    }

    public close(): Promise<void> {
        return this.realSession.close();
    }

    public beginTransaction(config?: TransactionConfig): Promise<Transaction> {
        return this.realSession.beginTransaction(config);
    }

    public readTransaction<T>(work: (tx: Transaction) => Promise<T>, config?: TransactionConfig): Promise<T> {
         return this.realSession.readTransaction(work, config);
    }

    public writeTransaction<T>(work: (tx: Transaction) => Promise<T>, config?: TransactionConfig): Promise<T> {
         return this.realSession.writeTransaction(work, config);
    }

    public executeRead<T>(work: (tx: Transaction) => Promise<T>, config?: TransactionConfig): Promise<T> {
         return this.realSession.executeRead(work, config);
    }

    public executeWrite<T>(work: (tx: Transaction) => Promise<T>, config?: TransactionConfig): Promise<T> {
         return this.realSession.executeWrite(work, config);
    }

    public lastBookmark(): string[] | null {
        return this.realSession.lastBookmark();
    }

    public lastBookmarks(): string[] {
        return this.realSession.lastBookmarks();
    }
}
