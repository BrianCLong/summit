import crypto from 'crypto';

export interface Transaction {
  id: string;
  externalId: string;
  type: 'charge' | 'refund' | 'payout' | 'adjustment';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  reconciledAt?: Date;
  createdAt: Date;
}

export interface ReconciliationReport {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalTransactions: number;
  reconciledCount: number;
  discrepancies: Discrepancy[];
  generatedAt: Date;
}

export interface Discrepancy {
  transactionId: string;
  type: 'missing_internal' | 'missing_external' | 'amount_mismatch';
  expectedAmount?: number;
  actualAmount?: number;
  details: string;
}

export class PaymentReconciliation {
  private transactions: Map<string, Transaction> = new Map();
  private reports: Map<string, ReconciliationReport> = new Map();

  async recordTransaction(params: {
    externalId: string;
    type: Transaction['type'];
    amount: number;
    currency: string;
  }): Promise<Transaction> {
    const id = `txn_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const transaction: Transaction = {
      id,
      externalId: params.externalId,
      type: params.type,
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      status: 'pending',
      createdAt: new Date(),
    };

    this.transactions.set(id, transaction);
    return transaction;
  }

  async reconcile(
    transactionId: string,
    externalData: { amount: number; status: string },
  ): Promise<Transaction> {
    const txn = this.transactions.get(transactionId);
    if (!txn) throw new Error('transaction_not_found');

    if (txn.amount !== externalData.amount) {
      throw new Error('amount_mismatch');
    }

    txn.status = 'completed';
    txn.reconciledAt = new Date();
    return txn;
  }

  async generateReport(periodStart: Date, periodEnd: Date): Promise<ReconciliationReport> {
    const periodTxns = Array.from(this.transactions.values()).filter(
      (t) => t.createdAt >= periodStart && t.createdAt <= periodEnd,
    );

    const reconciled = periodTxns.filter((t) => t.reconciledAt);
    const discrepancies: Discrepancy[] = periodTxns
      .filter((t) => !t.reconciledAt && t.status !== 'completed')
      .map((t) => ({
        transactionId: t.id,
        type: 'missing_external' as const,
        expectedAmount: t.amount,
        details: `Transaction ${t.id} not reconciled`,
      }));

    const report: ReconciliationReport = {
      id: `rpt_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
      periodStart,
      periodEnd,
      totalTransactions: periodTxns.length,
      reconciledCount: reconciled.length,
      discrepancies,
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  async getTransaction(transactionId: string): Promise<Transaction | null> {
    return this.transactions.get(transactionId) || null;
  }

  async getReport(reportId: string): Promise<ReconciliationReport | null> {
    return this.reports.get(reportId) || null;
  }

  async listPendingReconciliation(): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (t) => !t.reconciledAt && t.status === 'pending',
    );
  }
}

export default PaymentReconciliation;
