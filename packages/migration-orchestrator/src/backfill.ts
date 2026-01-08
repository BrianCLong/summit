import crypto from "node:crypto";

export class BackfillFramework {
  constructor(maxRetries = 3, batchSize = 50) {
    this.maxRetries = maxRetries;
    this.batchSize = batchSize;
    this.retries = {};
    this.dlq = [];
    this.checkpoints = [];
  }

  async run(payloads, handler, shouldCheckpoint) {
    let processed = 0;
    let failed = 0;
    for (let i = 0; i < payloads.length; i += this.batchSize) {
      const batch = payloads.slice(i, i + this.batchSize);
      await Promise.all(
        batch.map(async (payload, batchIndex) => {
          const idx = i + batchIndex;
          try {
            await handler(payload);
            processed += 1;
            if (shouldCheckpoint(idx, payload)) {
              this.checkpoints.push(idx);
            }
          } catch (error) {
            const key = crypto.createHash("sha1").update(JSON.stringify(payload)).digest("hex");
            this.retries[key] = (this.retries[key] ?? 0) + 1;
            const attemptsLeft = this.maxRetries - this.retries[key] + 1;
            if (attemptsLeft <= 0) {
              failed += 1;
              this.dlq.push({ payload, reason: error.message });
              return;
            }
            for (let attempt = 0; attempt < attemptsLeft; attempt++) {
              try {
                await handler(payload);
                processed += 1;
                return;
              } catch (retryError) {
                if (attempt === attemptsLeft - 1) {
                  failed += 1;
                  this.dlq.push({ payload, reason: retryError.message });
                }
              }
            }
          }
        })
      );
    }

    return { processed, failed, checkpoints: this.checkpoints, dlq: this.dlq };
  }
}
