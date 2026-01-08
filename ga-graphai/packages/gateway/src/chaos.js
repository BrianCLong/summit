const SAFE_ENVIRONMENTS = new Set(["dev", "development", "stage", "staging", "test"]);

function parseList(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export class ChaosError extends Error {
  constructor(service, fault, message = "Chaos fault injected") {
    super(message);
    this.service = service;
    this.fault = fault;
    this.code = "CHAOS_INJECTED";
    this.statusCode = fault === "disable" ? 503 : 500;
  }
}

export class ChaosEngine {
  constructor(options = {}) {
    this.environment =
      options.environment ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
    this.safeEnvironment = SAFE_ENVIRONMENTS.has(this.environment);
    this.enabled =
      this.safeEnvironment && (options.enabled ?? process.env.CHAOS_ENABLED === "true");
    this.latencyMs = Number.parseInt(options.latencyMs ?? process.env.CHAOS_LATENCY_MS ?? "0", 10);
    this.errorRate = Number.parseFloat(options.errorRate ?? process.env.CHAOS_ERROR_RATE ?? "0");
    this.disabledServices = new Set(
      options.disabledServices ?? parseList(process.env.CHAOS_DISABLE_SERVICE)
    );
    this.metrics = {
      latencyInjections: 0,
      errorsInjected: 0,
      servicesBlocked: 0,
    };
  }

  middleware() {
    return (req, _res, next) => {
      req.chaos = this;
      next();
    };
  }

  updateConfig(partial = {}) {
    if (!this.safeEnvironment) {
      return this.snapshot();
    }
    if (typeof partial.enabled === "boolean") {
      this.enabled = partial.enabled;
    }
    if (partial.latencyMs !== undefined) {
      const parsed = Number.parseInt(partial.latencyMs, 10);
      this.latencyMs = Number.isFinite(parsed) ? parsed : this.latencyMs;
    }
    if (partial.errorRate !== undefined) {
      const parsed = Number.parseFloat(partial.errorRate);
      this.errorRate = Number.isFinite(parsed) ? parsed : this.errorRate;
    }
    if (partial.disabledServices) {
      this.disabledServices = new Set(
        parseList(partial.disabledServices.join?.(",") ?? partial.disabledServices)
      );
    }
    return this.snapshot();
  }

  isEnabled() {
    return this.safeEnvironment && this.enabled;
  }

  isServiceDisabled(service) {
    return this.disabledServices.has(service);
  }

  async apply(service, handler) {
    if (!this.isEnabled()) {
      return handler();
    }

    if (this.isServiceDisabled(service)) {
      this.metrics.servicesBlocked += 1;
      this.logFault(service, "disable");
      throw new ChaosError(service, "disable", `${service} intentionally disabled`);
    }

    if (this.latencyMs > 0) {
      this.metrics.latencyInjections += 1;
      this.logFault(service, "latency");
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    if (this.errorRate > 0 && Math.random() < this.errorRate) {
      this.metrics.errorsInjected += 1;
      this.logFault(service, "error");
      throw new ChaosError(service, "error", `${service} random failure injected`);
    }

    return handler();
  }

  logFault(service, fault) {
    const payload = {
      at: new Date().toISOString(),
      environment: this.environment,
      service,
      fault,
    };
    // eslint-disable-next-line no-console
    console.warn("[chaos] fault injected", payload);
  }

  snapshot() {
    return {
      environment: this.environment,
      safeEnvironment: this.safeEnvironment,
      enabled: this.isEnabled(),
      latencyMs: this.latencyMs,
      errorRate: this.errorRate,
      disabledServices: Array.from(this.disabledServices),
      metrics: this.metrics,
    };
  }
}
