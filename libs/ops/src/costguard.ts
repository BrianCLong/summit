let ENFORCE = process.env.COST_GUARD_ENFORCE === "1";

export function setEnforce(enabled: boolean) {
  ENFORCE = enabled;
}

export function killIfSlow(start: number, res: any) {
  const ms = Date.now() - start;
  if (ENFORCE && ms > Number(process.env.SLO_MS || 500)) {
    res.status(503).end();
  }
}

export function guard(req: any, res: any, next: any) {
  const t = Date.now();
  res.on("finish", () => killIfSlow(t, res));
  next();
}
