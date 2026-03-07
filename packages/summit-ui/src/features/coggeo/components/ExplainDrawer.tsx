import React from "react";
import type { ExplainPayload } from "../hooks/useCogGeoApi.js";

export function ExplainDrawer(props: {
  open: boolean;
  onClose: () => void;
  payload: ExplainPayload | null;
  loading?: boolean;
  error?: string | null;
}) {
  if (!props.open) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 420,
        height: "100%",
        background: "rgba(255,255,255,0.98)",
        borderLeft: "1px solid #e5e7eb",
        padding: 16,
        overflow: "auto",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.10)",
        zIndex: 3,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700 }}>Explain</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Evidence-backed interpretation</div>
        </div>
        <button
          onClick={props.onClose}
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>

      {props.loading && <div style={{ color: "#374151" }}>Loading explanation…</div>}
      {props.error && <div style={{ color: "#b91c1c" }}>{props.error}</div>}

      {props.payload && (
        <>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              background: "#f9fafb",
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280" }}>Kind</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{props.payload.kind}</div>

            <div style={{ fontSize: 12, color: "#6b7280" }}>Confidence</div>
            <div style={{ fontWeight: 600 }}>{props.payload.confidence.toFixed(2)}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Summary</div>
            <div style={{ lineHeight: 1.5 }}>{props.payload.summary}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Drivers</div>
            {props.payload.drivers.length === 0 ? (
              <div style={{ color: "#6b7280" }}>(none)</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {props.payload.drivers.map((d) => (
                  <div
                    key={`${d.name}-${d.delta}`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{d.name}</strong>
                      <span>Δ {d.delta.toFixed(3)}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                      Evidence refs: {d.evidence.join(", ") || "(none)"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {props.payload.top_narratives && props.payload.top_narratives.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Top narratives</div>
              <div style={{ display: "grid", gap: 8 }}>
                {props.payload.top_narratives.map((n) => (
                  <div
                    key={`${n.narrative_id}-${n.role}`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <div><strong>{n.narrative_id}</strong></div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Role: {n.role}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Evidence: {n.evidence.join(", ") || "(none)"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Provenance</div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                background: "#111827",
                color: "#f9fafb",
                borderRadius: 10,
                padding: 12,
              }}
            >
              {JSON.stringify(props.payload.provenance, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
