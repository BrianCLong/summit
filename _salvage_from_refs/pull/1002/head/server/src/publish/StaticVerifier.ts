export function lintTemplate(manifest: any, code: string) {
  if (!manifest.dp) throw new Error('dp_required');
  if ((manifest.kMin ?? 0) < 25) throw new Error('kmin_too_low');
  if (/load\s+csv|apoc\.|CALL\s+db\./i.test(code)) throw new Error('dangerous_fn_detected');
  if (/SELECT\s+.*COUNT\(\*\).*FROM.*GROUP BY.*$/im.test(code) && !/dp/i.test(code)) {
    throw new Error('raw_aggregate_forbidden');
  }
  return { ok: true };
}
