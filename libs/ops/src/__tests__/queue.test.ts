import { afterEach, beforeEach, describe, expect, it, vi } from "@jest/globals";
import { enqueue, setQueueClient, QueueClient, QueueJob } from "../queue.js";
import { queueDepth } from "../metrics-queue.js";

class InMemoryQueue implements QueueClient {
  list: string[] = [];
  async lpush(_key: string, value: string): Promise<number> {
    this.list.unshift(value);
    return this.list.length;
  }
  async llen(_key: string): Promise<number> {
    return this.list.length;
  }
}

describe("enqueue", () => {
  beforeEach(() => {
    setQueueClient(null);
  });

  afterEach(() => {
    setQueueClient(null);
  });

  it("enriches job with id and enqueuedAt and updates depth gauge", async () => {
    const setSpy = vi.spyOn(queueDepth, "set");
    const queue = new InMemoryQueue();
    setQueueClient(queue);

    const job: QueueJob = { type: "OCR", payload: { filePath: "/tmp/demo" } };
    const id = await enqueue(job);

    expect(typeof id).toBe("string");
    expect(queue.list).toHaveLength(1);
    expect(setSpy).toHaveBeenCalledWith(1);

    setSpy.mockRestore();
  });

  it("throws when type is missing", async () => {
    setQueueClient(new InMemoryQueue());
    await expect(enqueue({ payload: {} } as QueueJob)).rejects.toThrow("queue_job_missing_type");
  });
});
