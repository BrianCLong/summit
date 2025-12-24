export function maybeLatency(req: any, _res: any, next: any) {
  if (process.env.CHAOS_LATENCY_MS) {
    const d = Number(process.env.CHAOS_LATENCY_MS);
    setTimeout(next, d);
    return;
  }
  next();
}
