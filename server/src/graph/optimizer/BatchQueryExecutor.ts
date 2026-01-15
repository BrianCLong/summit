import { getNeo4jDriver } from '../../db/neo4j.js';
import { telemetry } from '../../lib/telemetry/comprehensive-telemetry.js';

export class BatchQueryExecutor {
  private queue: Array<{
    query: string;
    params: any;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  private timer: NodeJS.Timeout | null = null;
  private readonly batchSize = 10;
  private readonly batchWindowMs = 50;

  public execute(query: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ query, params, resolve, reject });
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchWindowMs);
      }
    });
  }

  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);

    // Execute as transaction
    const session = getNeo4jDriver().session();
    const tx = session.beginTransaction();

    try {
      const promises = batch.map(item =>
        tx.run(item.query, item.params)
          .then((res: unknown) => ({ status: 'fulfilled', value: res, item }))
          .catch((err: unknown) => ({ status: 'rejected', reason: err, item }))
      );

      const results = await Promise.all(promises);
      await tx.commit();

      results.forEach((res: any) => {
        if (res.status === 'fulfilled') {
          res.item.resolve(res.value);
        } else {
          res.item.reject(res.reason);
        }
      });

      // telemetry.subsystems.database.batch.size.record(batch.length);

    } catch (error: any) {
       await tx.rollback();
       batch.forEach(item => item.reject(error));
    } finally {
       await session.close();
    }
  }
}
