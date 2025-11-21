// =============================================
// File: apps/web/src/lib/flags.ts
// =============================================
export function isMaestroEnabled(): boolean {
  // Vite prefixes client env with VITE_
  const raw = (import.meta as any).env?.VITE_MAESTRO_ENABLED
  if (raw === undefined) return true // default enabled in dev
  return String(raw).toLowerCase() === 'true'
}

export function isEnhancedTriPaneEnabled(): boolean {
  const raw = (import.meta as any).env?.VITE_ENHANCED_TRI_PANE_ENABLED
  if (raw === undefined) return true // default enabled in dev
  return String(raw).toLowerCase() === 'true'
}

export function isExplainViewEnabled(): boolean {
  const raw = (import.meta as any).env?.VITE_EXPLAIN_VIEW_ENABLED
  if (raw === undefined) return true // default enabled in dev
  return String(raw).toLowerCase() === 'true'
}
