export type Config = {
  port: number;
  opaUrl: string;
  ledgerPath: string;
};

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 4319),
    opaUrl: process.env.OPA_URL ?? "http://localhost:8181",
    ledgerPath: process.env.COMPLIANCE_LEDGER_PATH ?? "data/attestations.ndjson"
  };
}
