import crypto from "node:crypto";

export class AccessEventEmitter {
  constructor() {
    this.subscribers = [];
    this.events = [];
  }

  subscribe(handler) {
    this.subscribers.push(handler);
  }

  emit(event) {
    this.events.push(event);
    for (const handler of this.subscribers) {
      handler(event);
    }
  }
}

export class InMemoryBudgetStore {
  constructor() {
    this.state = new Map();
  }

  get(key) {
    return this.state.get(key);
  }

  set(key, value) {
    this.state.set(key, value);
  }
}

export class PrivacyBudgetTracker {
  constructor(options = {}) {
    this.store = options.store ?? new InMemoryBudgetStore();
    this.clock = options.clock ?? (() => new Date());
    this.defaults = {
      daily_limit: 1000,
      burst_limit: 300,
      per_user_limit: 200,
      ...options.defaults,
    };
  }

  key(tenantId, dataset) {
    return `${tenantId}:${dataset}`;
  }

  snapshot(tenantId, dataset) {
    const record = this.store.get(this.key(tenantId, dataset)) ?? {
      total: 0,
      daily: 0,
      perUser: new Map(),
      windowStart: this.clock(),
    };
    return record;
  }

  evaluate({ tenantId, dataset, userId, volume }) {
    const now = this.clock();
    const state = this.snapshot(tenantId, dataset);
    if (this.dayHasRolled(state.windowStart, now)) {
      state.daily = 0;
      state.perUser = new Map();
      state.windowStart = now;
    }
    const total = state.total + volume;
    const daily = state.daily + volume;
    const perUserTotal = (state.perUser.get(userId) ?? 0) + volume;
    const limits = this.defaults;
    const overBurst = daily > limits.burst_limit;
    const overDaily = daily > limits.daily_limit;
    const overUser = perUserTotal > limits.per_user_limit;
    const alert = overBurst || overDaily || overUser;
    const remaining = Math.max(0, limits.daily_limit - daily);
    return {
      alert,
      remaining,
      overBurst,
      overDaily,
      overUser,
      nextWindow: new Date(state.windowStart.getTime() + 24 * 60 * 60 * 1000),
      projectedTotal: total,
      perUserTotal,
      perUserLimit: limits.per_user_limit,
    };
  }

  consume({ tenantId, dataset, userId, volume }) {
    const now = this.clock();
    const state = this.snapshot(tenantId, dataset);
    if (this.dayHasRolled(state.windowStart, now)) {
      state.daily = 0;
      state.perUser = new Map();
      state.windowStart = now;
    }
    const decision = this.evaluate({ tenantId, dataset, userId, volume });
    state.total += volume;
    state.daily += volume;
    state.perUser.set(userId, (state.perUser.get(userId) ?? 0) + volume);
    this.store.set(this.key(tenantId, dataset), state);
    return decision;
  }

  dayHasRolled(start, now) {
    return start.toDateString() !== now.toDateString();
  }
}

export class AccessLogger {
  constructor(options = {}) {
    this.emitter = options.emitter ?? new AccessEventEmitter();
  }

  log(event) {
    const enriched = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
    this.emitter.emit(enriched);
    return enriched;
  }
}

export function buildPrivacyEnforcement({ tracker, logger, thresholds } = {}) {
  const budgetTracker = tracker ?? new PrivacyBudgetTracker({ defaults: thresholds });
  const accessLogger = logger ?? new AccessLogger();
  return {
    enforce(req, dataset = "search") {
      const tenantId = req.query.tenant_id;
      const userId = req.header("x-user") ?? "unknown-user";
      const volume = Math.min(Number(req.query.page_size ?? 20), 100);
      const decision = budgetTracker.consume({
        tenantId,
        dataset,
        userId,
        volume,
      });
      const event = accessLogger.log({
        who: userId,
        tenant: tenantId,
        dataset,
        purpose: req.header("x-purpose") ?? "unspecified",
        volume,
        decision: decision.alert ? "blocked" : "allowed",
        timestamp: new Date().toISOString(),
      });
      return { decision, event };
    },
  };
}
