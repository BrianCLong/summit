"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackpressureController = exports.PriorityClass = void 0;
const events_1 = require("events");
var PriorityClass;
(function (PriorityClass) {
    PriorityClass[PriorityClass["CRITICAL"] = 0] = "CRITICAL";
    PriorityClass[PriorityClass["NORMAL"] = 1] = "NORMAL";
    PriorityClass[PriorityClass["BEST_EFFORT"] = 2] = "BEST_EFFORT";
})(PriorityClass || (exports.PriorityClass = PriorityClass = {}));
/**
 * Controls admission to the system based on concurrency and queue depth.
 */
class BackpressureController extends events_1.EventEmitter {
    static instance;
    // Configuration
    maxConcurrency = 1000;
    maxTenantConcurrency = 50;
    maxQueueDepth = 5000;
    // State
    currentConcurrency = 0;
    activeRequests = new Set();
    // Map RequestID -> TenantID to track which tenant owns which active request
    requestTenantMap = new Map();
    // Map TenantID -> Active Count
    tenantConcurrency = new Map();
    queueDepth = 0;
    queues = {
        [PriorityClass.CRITICAL]: [],
        [PriorityClass.NORMAL]: [],
        [PriorityClass.BEST_EFFORT]: [],
    };
    timer;
    constructor() {
        super();
        // Start processing loop
        this.timer = setInterval(() => this.processQueue(), 100);
        // Unref the timer so it doesn't prevent the process from exiting during tests
        if (this.timer.unref) {
            this.timer.unref();
        }
    }
    static getInstance() {
        if (!BackpressureController.instance) {
            BackpressureController.instance = new BackpressureController();
        }
        return BackpressureController.instance;
    }
    /**
     * Request admission to the system.
     */
    async requestAdmission(req) {
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
    activateRequest(id, tenantId) {
        this.activeRequests.add(id);
        this.currentConcurrency = this.activeRequests.size;
        this.requestTenantMap.set(id, tenantId);
        const count = this.tenantConcurrency.get(tenantId) || 0;
        this.tenantConcurrency.set(tenantId, count + 1);
    }
    waitForSlot(req) {
        return new Promise((resolve) => {
            // We attach the resolve function to the request so we can call it later
            req._resolve = resolve;
            // Timeout fallback
            setTimeout(() => {
                if (req._resolve) {
                    this.removeRequest(req);
                    resolve({ allowed: false, status: 'REJECTED', reason: 'Timeout in queue' });
                }
            }, 30000); // 30s max queue time
        });
    }
    /**
     * Release a slot when work is done.
     */
    release(reqId) {
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
    processQueue() {
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
                    if (nextReq._resolve) {
                        nextReq._resolve({ allowed: false, status: 'REJECTED', reason: 'Tenant concurrency limit exceeded during queue processing' });
                        delete nextReq._resolve;
                    }
                    continue; // Try next
                }
                // Mark as active
                this.activateRequest(nextReq.id, nextReq.tenantId);
                if (nextReq._resolve) {
                    nextReq._resolve({ allowed: true, status: 'ACCEPTED' });
                    delete nextReq._resolve;
                }
            }
            else {
                // No more requests in queue
                break;
            }
        }
    }
    getNextRequest() {
        if (this.queues[PriorityClass.CRITICAL].length > 0)
            return this.queues[PriorityClass.CRITICAL].shift();
        if (this.queues[PriorityClass.NORMAL].length > 0)
            return this.queues[PriorityClass.NORMAL].shift();
        if (this.queues[PriorityClass.BEST_EFFORT].length > 0)
            return this.queues[PriorityClass.BEST_EFFORT].shift();
        return undefined;
    }
    removeRequest(req) {
        const queue = this.queues[req.priority];
        const idx = queue.indexOf(req);
        if (idx > -1) {
            queue.splice(idx, 1);
            this.queueDepth--;
        }
        delete req._resolve;
    }
    // Metrics
    getMetrics() {
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
exports.BackpressureController = BackpressureController;
