import { config } from "dotenv";
config();

type FlagKey = "db.dual_write" | "db.shadow_read" | "db.backfill.rps" | "db.cutover.enabled";

type FlagBoolean = "true" | "false";

type FlagMap = Record<FlagKey, string | undefined>;

const flagEnv: FlagMap = {
  "db.dual_write": process.env.DB_DUAL_WRITE,
  "db.shadow_read": process.env.DB_SHADOW_READ,
  "db.backfill.rps": process.env.DB_BACKFILL_RPS,
  "db.cutover.enabled": process.env.DB_CUTOVER_ENABLED,
};

export function isDualWriteEnabled(): boolean {
  return coerceBool(flagEnv["db.dual_write"], true);
}

export function isShadowReadEnabled(): boolean {
  return coerceBool(flagEnv["db.shadow_read"], false);
}

export function backfillRps(): number {
  const raw = flagEnv["db.backfill.rps"];
  const parsed = raw ? Number(raw) : 50;
  return Number.isFinite(parsed) ? parsed : 50;
}

export function isCutoverEnabled(): boolean {
  return coerceBool(flagEnv["db.cutover.enabled"], false);
}

function coerceBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.toLowerCase() as FlagBoolean;
  return normalized === "true" ? true : normalized === "false" ? false : fallback;
}

export function logMigrationFlags(): void {
  const payload = {
    dual_write: isDualWriteEnabled(),
    shadow_read: isShadowReadEnabled(),
    backfill_rps: backfillRps(),
    cutover_enabled: isCutoverEnabled(),
  };
  // eslint-disable-next-line no-console
  console.info(JSON.stringify({ event: "migration_flags", payload }));
}
