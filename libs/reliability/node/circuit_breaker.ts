import EventEmitter from "events";
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoverySeconds: number;
  p95BudgetMs: number;
  service: string;
  store: string;
}

export class CircuitBreaker extends EventEmitter {
  private failures = 0;
  private state: CircuitState = "closed";
  private readonly registry: Registry;
  private readonly stateGauge: Gauge<string>;
  private readonly latencyHist: Histogram<string>;
  private readonly errorsTotal: Counter<string>;
  private timer?: NodeJS.Timeout;

  constructor(private readonly options: CircuitBreakerOptions) {
    super();
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.stateGauge = new Gauge({
      name: "db_cb_state",
      help: "Circuit breaker state (0=closed,1=open,2=half-open)",
      labelNames: ["service", "store"],
      registers: [this.registry],
    });

    this.latencyHist = new Histogram({
      name: "db_query_latency_seconds",
      help: "Latency histogram for DB calls",
      labelNames: ["store", "op"],
      buckets: [0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.5, 1, 2, 3],
      registers: [this.registry],
    });

    this.errorsTotal = new Counter({
      name: "db_errors_total",
      help: "Total DB errors",
      labelNames: ["store", "code"],
      registers: [this.registry],
    });
  }

  public async execute<T>(op: string, fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      this.errorsTotal.inc({ store: this.options.store, code: "circuit_open" });
      throw new Error("Circuit breaker is open");
    }

    const start = process.hrtime.bigint();
    try {
      const result = await fn();
      this.recordLatency(op, start);
      this.reset();
      return result;
    } catch (err) {
      this.recordLatency(op, start);
      this.failures += 1;
      this.errorsTotal.inc({ store: this.options.store, code: "operation_failed" });
      if (this.failures >= this.options.failureThreshold) {
        this.trip();
      }
      throw err;
    }
  }

  public async withHalfOpen<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state !== "open") return this.execute("half_open_probe", fn);
    this.state = "half-open";
    this.updateGauge();
    try {
      const result = await this.execute("half_open_probe", fn);
      this.reset();
      return result;
    } catch (err) {
      this.trip();
      throw err;
    }
  }

  private recordLatency(op: string, start: bigint) {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    this.latencyHist.observe({ store: this.options.store, op }, durationSeconds);
  }

  private trip() {
    if (this.state === "open") return;
    this.state = "open";
    this.updateGauge();
    this.emit("open");
    this.timer?.unref();
    this.timer = setTimeout(() => {
      this.state = "half-open";
      this.updateGauge();
      this.emit("half-open");
    }, this.options.recoverySeconds * 1000);
  }

  private reset() {
    this.failures = 0;
    if (this.state !== "closed") {
      this.state = "closed";
      this.updateGauge();
      this.emit("closed");
    }
  }

  private updateGauge() {
    const stateValue = this.state === "closed" ? 0 : this.state === "open" ? 1 : 2;
    this.stateGauge.set({ service: this.options.service, store: this.options.store }, stateValue);
  }

  public metrics() {
    return this.registry.metrics();
  }
}
