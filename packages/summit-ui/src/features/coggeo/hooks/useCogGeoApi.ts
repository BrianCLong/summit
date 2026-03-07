import { useCallback } from "react";

export type ExplainKind = "storm" | "well" | "fault" | "plate" | "current" | "terrain";

export interface ExplainPayload {
  id: string;
  kind: ExplainKind;
  summary: string;
  drivers: Array<{ name: string; delta: number; evidence: string[] }>;
  top_narratives?: Array<{ narrative_id: string; role: string; evidence: string[] }>;
  confidence: number;
  provenance: { models: string[]; prompt_ids?: string[] };
}

export function useCogGeoApi(baseUrl = "/coggeo") {
  const getHealth = useCallback(async () => {
    const r = await fetch(`${baseUrl}/health`);
    if (!r.ok) throw new Error(`getHealth failed: ${r.status}`);
    return await r.json();
  }, [baseUrl]);

  const listNarratives = useCallback(async () => {
    const r = await fetch(`${baseUrl}/narratives`);
    if (!r.ok) throw new Error(`listNarratives failed: ${r.status}`);
    return (await r.json()) as Array<{ id: string; title: string }>;
  }, [baseUrl]);

  const listStorms = useCallback(async (args: { timeRange: string; narrativeId?: string }) => {
    const u = new URL(`${window.location.origin}${baseUrl}/storms`);
    u.searchParams.set("timeRange", args.timeRange);
    if (args.narrativeId) u.searchParams.set("narrativeId", args.narrativeId);
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`listStorms failed: ${r.status}`);
    return (await r.json()) as Array<{ id: string; narrative_id: string; start_ts: string; severity: number; explain_ref: string }>;
  }, [baseUrl]);

  const getExplain = useCallback(async (explainId: string) => {
    const r = await fetch(`${baseUrl}/explain/${encodeURIComponent(explainId)}`);
    if (!r.ok) throw new Error(`getExplain failed: ${r.status}`);
    return (await r.json()) as ExplainPayload;
  }, [baseUrl]);

  return { getHealth, listNarratives, listStorms, getExplain };
}
