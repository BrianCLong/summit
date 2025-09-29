import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { Request, Response, NextFunction } from "express";
import { loadOverride } from "./admission_override";
import { admissionDecision } from "./metrics";

// QoS policy shape loaded from router/qos.yaml
interface QoSExpertOverrides { explore_max?: number; }
interface QoSClass { explore_max: number; queue_target_sec: number; budget_overdraft_pct: number; experts?: Record<string, QoSExpertOverrides>; }
interface QoSConfig { classes: { [tier: string]: QoSClass }; }

export interface JobRequest {
  tenantId: string;
  tenant_tier: string; // e.g., team|business|enterprise
  expert: string;
  exploration_percent?: number; // 0..100
  payload: unknown;
}

export interface AdmissionStats {
    recentExploreRatio: number;
    queueOldestAgeSec: number;
    tenantBudgetRemaining: number;
}

export interface AdmissionDecision {
  ok: boolean;
  reason?: string;
  suggest?: { degrade?: boolean; route?: string; };
}

const DEFAULT_QOS_PATH = process.env.QOS_CONFIG_PATH || path.resolve(process.cwd(), "router/qos.yaml");

export class AdmissionController {
  private cfg: QoSConfig;

  constructor(cfgPath = DEFAULT_QOS_PATH) {
    const raw = fs.readFileSync(cfgPath, "utf8");
    this.cfg = yaml.load(raw) as QoSConfig;
  }

  private effectiveExploreMax(cls: QoSClass, expert: string): number {
    const o = cls.experts?.[expert]?.explore_max;
    return typeof o === "number" ? o : cls.explore_max;
  }

  public shouldAdmit(req: { tenantTier: string, expert: string, exploration?: boolean }, stats: AdmissionStats): AdmissionDecision {
    const cls = this.cfg.classes[req.tenantTier] || this.cfg.classes["default"];
    if (!cls) {
        return { ok: false, reason: `unknown tier: ${req.tenantTier}` };
    }

    const effExploreMax = this.effectiveExploreMax(cls, req.expert);
    if (req.exploration && stats.recentExploreRatio >= effExploreMax) {
      return {
        ok: false,
        reason: `exploration cap exceeded (${stats.recentExploreRatio.toFixed(3)} >= ${effExploreMax})`,
        suggest: { degrade: true, route: "fallback" }
      };
    }
    return { ok: true };
  }
}
