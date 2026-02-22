export type TouchpointEventType = "engagement" | "provenance" | "verification";

export type TouchpointEvent = {
  product_id: string;
  type: TouchpointEventType;
  payload: string;
  signature: string; // required
};

export function validateTouchpointEvent(e: TouchpointEvent): { ok: boolean; reason?: string } {
  // Deny-by-default: must have non-empty signature
  if (!e.signature || e.signature.trim().length < 16) {
    return { ok: false, reason: "missing_or_short_signature" };
  }

  // Deny-by-default: must have valid type
  const validTypes: TouchpointEventType[] = ["engagement", "provenance", "verification"];
  if (!validTypes.includes(e.type)) {
    return { ok: false, reason: "invalid_event_type" };
  }

  return { ok: true };
}
