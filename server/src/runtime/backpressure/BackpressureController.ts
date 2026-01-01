
import { EventEmitter } from 'events';

export enum PriorityClass {
  CRITICAL = 0,
  NORMAL = 1,
  BEST_EFFORT = 2,
}

export interface AdmissionRequest {
  id: string;
  tenantId: string;
  priority: PriorityClass;
  cost?: number;
  metadata?: Record<string, any>;
}

export interface AdmissionResult {
  allowed: boolean;
  reason?: string;
  waitMs?: number;
  status: 'ACCEPTED' | 'REJECTED' | 'QUEUED';
}

/**
 * Controls admission to the system based on concurrency and queue depth.
 */
export class BackpressureController extends EventEmitter {
  private static instance: BackpressureController;

  // Configuration
  private maxConcurrency = 1000;
  private maxTenantConcurrency = 50;
  private maxQueueDepth = 5000;

  // State
  private currentConcurrency = 0;
  private activeRequests: Set<string> = new Set();
  // Map RequestID -> TenantID to track which tenant owns which active request
  private requestTenantMap: Map<string, string> = new Map();
  // Map TenantID -> Active Count
  private tenantConcurrency: Map<string, number> = new Map();

  private queueDepth = 0;
  private queues: Record<PriorityClass, AdmissionRequest[]> = {
    [PriorityClass.CRITICAL]: [],
    [PriorityClass.NORMAL]: [],
    [PriorityClass.BEST_EFFORT]: [],
  };

  private timer: NodeJS.Timeout;

  private constructor() {
    super();
    // Start processing loop
    this.timer = setInterval(() => this.processQueue(), 100);
    // Unref the timer so it doesn't prevent the process from exiting during tests
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  public static getInstance(): BackpressureController {
    if (!BackpressureController.instance) {
      BackpressureController.instance = new BackpressureController();
    }
    return BackpressureController.instance;
  }

  /**
   * Request admission to the system.
   */
  public async requestAdmission(req: AdmissionRequest): Promise<AdmissionResult> {
    const tenantCount = this.tenantConcurrency.get(req.tenantId) || 0;

    // Check Tenant Limits (Fail fast if tenant saturated, UNLESS Critical)
    if (tenantCount >= this.maxTenantConcurrency && req.priority > PriorityClass.CRITICAL) {
        return { allowed: false, status: 'REJECTED', reason: 'Tenant concurrency limit exceeded' };
    }

    // 1. Check if we can execute immediately (Global Concurrency)
    if (this.currentConcurrency < this.maxConcurrency && this.queueDepth === 0) {
      this.activateRequest(req.id, req.tenantId);
      return { allowed: true, status: 'ACCEPTED' };
    }

    // 2. Check Queue Limits
    if (this.queueDepth >= this.maxQueueDepth) {
      if (req.priority > PriorityClass.CRITICAL) {
        return { allowed: false, status: 'REJECTED', reason: 'System overloaded' };
      }
    }

    // 3. Enqueue
    this.queues[req.priority].push(req);
    this.queueDepth++;

    return this.waitForSlot(req);
  }

  private activateRequest(id: string, tenantId: string) {
      this.activeRequests.add(id);
      this.currentConcurrency = this.activeRequests.size;

      this.requestTenantMap.set(id, tenantId);
      const count = this.tenantConcurrency.get(tenantId) || 0;
      this.tenantConcurrency.set(tenantId, count + 1);
  }

  private waitForSlot(req: AdmissionRequest): Promise<AdmissionResult> {
    return new Promise((resolve) => {
      // We attach the resolve function to the request so we can call it later
      (req as any)._resolve = resolve;

      // Timeout fallback
      setTimeout(() => {
        if ((req as any)._resolve) {
           this.removeRequest(req);
           resolve({ allowed: false, status: 'REJECTED', reason: 'Timeout in queue' });
        }
      }, 30000); // 30s max queue time
    });
  }

  /**
   * Release a slot when work is done.
   */
  public release(reqId: string): void {
    if (this.activeRequests.has(reqId)) {
        this.activeRequests.delete(reqId);
        this.currentConcurrency = this.activeRequests.size;

        // Decrement tenant count
        const tenantId = this.requestTenantMap.get(reqId);
        if (tenantId) {
            const count = this.tenantConcurrency.get(tenantId) || 0;
            if (count > 0) {
                this.tenantConcurrency.set(tenantId, count - 1);
            }
            this.requestTenantMap.delete(reqId);
        }

        // Trigger processing immediately
        setImmediate(() => this.processQueue());
    }
  }

  private processQueue() {
    // Fill all available slots
    while (this.currentConcurrency < this.maxConcurrency) {
        // Strict Priority: Critical > Normal > Best Effort
        // Peek to check tenant limits before dequeueing?
        // For simplicity, we dequeue, check limits, and if blocked, maybe we should skip?
        // But skipping adds complexity (head-of-line blocking for tenant).
        // For this sprint: if next req is blocked by tenant limit, we REJECT it (dequeue and fail).

        const nextReq = this.getNextRequest();

        if (nextReq) {
            this.queueDepth--;

            // Check tenant limit again
            const tenantCount = this.tenantConcurrency.get(nextReq.tenantId) || 0;
            if (tenantCount >= this.maxTenantConcurrency && nextReq.priority > PriorityClass.CRITICAL) {
                // Reject due to tenant limit (dequeued but not allowed)
                if ((nextReq as any)._resolve) {
                    (nextReq as any)._resolve({ allowed: false, status: 'REJECTED', reason: 'Tenant concurrency limit exceeded during queue processing' });
                    delete (nextReq as any)._resolve;
                }
                continue; // Try next
            }

            // Mark as active
            this.activateRequest(nextReq.id, nextReq.tenantId);

            if ((nextReq as any)._resolve) {
                (nextReq as any)._resolve({ allowed: true, status: 'ACCEPTED' });
                delete (nextReq as any)._resolve;
            }
        } else {
            // No more requests in queue
            break;
        }
    }
  }

  private getNextRequest(): AdmissionRequest | undefined {
      if (this.queues[PriorityClass.CRITICAL].length > 0) return this.queues[PriorityClass.CRITICAL].shift();
      if (this.queues[PriorityClass.NORMAL].length > 0) return this.queues[PriorityClass.NORMAL].shift();
      if (this.queues[PriorityClass.BEST_EFFORT].length > 0) return this.queues[PriorityClass.BEST_EFFORT].shift();
      return undefined;
  }

  private removeRequest(req: AdmissionRequest) {
    const queue = this.queues[req.priority];
    const idx = queue.indexOf(req);
    if (idx > -1) {
      queue.splice(idx, 1);
      this.queueDepth--;
    }
    delete (req as any)._resolve;
  }

  // Metrics
  public getMetrics() {
    return {
      concurrency: this.currentConcurrency,
      queueDepth: this.queueDepth,
      queues: {
        critical: this.queues[PriorityClass.CRITICAL].length,
        normal: this.queues[PriorityClass.NORMAL].length,
        bestEffort: this.queues[PriorityClass.BEST_EFFORT].length,
      }
    };
  }
}
