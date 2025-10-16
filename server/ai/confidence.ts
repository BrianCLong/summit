export function shouldEscalate(conf: {
  risk: number;
  schemaErrors: number;
  evalProxy: number;
}) {
  if (conf.schemaErrors > 0) return true;
  if (conf.risk > 0.75 && conf.evalProxy < 0.82) return true;
  return false;
}
