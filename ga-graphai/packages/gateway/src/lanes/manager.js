import fs from "node:fs";

const UNSAFE_KEYS = ["disable_audit", "weaken_auth", "bypass_policy"];

export class LaneManager {
  constructor(options = {}) {
    this.basePath = options.basePath ?? "lanes";
    this.auditLog = options.auditLog ?? [];
  }

  loadConfig(lane) {
    const path = `${this.basePath}/${lane}/config.json`;
    const raw = fs.readFileSync(path, "utf8");
    return JSON.parse(raw);
  }

  validate(config) {
    for (const key of UNSAFE_KEYS) {
      if (config[key]) {
        throw new Error(`UNSAFE_OVERRIDE:${key}`);
      }
    }
    if (!config.canary || config.canary.weight == null) {
      throw new Error("CANARY_REQUIRED");
    }
    return true;
  }

  promote(lane, version) {
    const config = this.loadConfig(lane);
    this.validate(config);
    const entry = {
      lane,
      version,
      timestamp: new Date().toISOString(),
      canary: config.canary,
      rollback: config.rollback,
    };
    this.audit(entry);
    return entry;
  }

  audit(entry) {
    this.auditLog.push(entry);
  }
}
