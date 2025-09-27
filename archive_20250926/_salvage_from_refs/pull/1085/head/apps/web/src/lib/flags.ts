// =============================================
// File: apps/web/src/lib/flags.ts
// =============================================
export function isMaestroEnabled(): boolean {
  // Vite prefixes client env with VITE_
  const raw = (import.meta as any).env?.VITE_MAESTRO_ENABLED;
  if (raw === undefined) return true; // default enabled in dev
  return String(raw).toLowerCase() === 'true';
}
