import { DateTime } from 'luxon';

export type Window = { start: string; end: string; days?: number[] };
export type ModelCaps = {
  name: string;
  class: 'local' | 'hosted';
  rpm_cap: number;
  tpm_cap: number;
  daily_usd_cap?: number;
  usage_windows?: Window[];
  counters: { rpm: number; tpm: number; usd_today: number; window_open: boolean };
};

export function isWindowOpen(windows: Window[] | undefined, now = DateTime.local()): boolean {
  if (!windows || windows.length === 0) return true; // no windows means always on
  const wd = now.weekday % 7; // 1..7 → 0..6
  const hm = now.toFormat('HH:mm');
  return windows.some(w => (w.days ? w.days.includes(wd) : true) && hm >= w.start && hm < w.end);
}

export function canRoute(model: ModelCaps): { ok: boolean; reason?: string } {
  if (!isWindowOpen(model.usage_windows)) return { ok: false, reason: 'window_closed' };
  if (model.counters.rpm >= model.rpm_cap) return { ok: false, reason: 'rpm_exhausted' };
  if (model.counters.tpm >= model.tpm_cap) return { ok: false, reason: 'tpm_exhausted' };
  if (model.daily_usd_cap && model.counters.usd_today >= model.daily_usd_cap) {
    return { ok: false, reason: 'budget_exhausted' };
  }
  return { ok: true };
}

export function pickModel(
  candidates: ModelCaps[],
  pref: string[] = [],
  fallback: string[] = []
): { chosen?: ModelCaps; denied: Record<string, string> } {
  const denied: Record<string, string> = {};
  const order = [...pref, ...candidates.map(c => c.name).filter(n => !pref.includes(n)), ...fallback];
  for (const name of order) {
    const m = candidates.find(c => c.name === name);
    if (!m) continue;
    const gate = canRoute(m);
    if (gate.ok) return { chosen: m, denied };
    denied[name] = gate.reason || 'unknown';
  }
  return { denied };
}
