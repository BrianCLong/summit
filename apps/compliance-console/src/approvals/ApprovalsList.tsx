import { ApprovalRequest } from "./types";

type Props = {
  requests: ApprovalRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * Render the list of approval requests with quick status context.
 */
export function ApprovalsList({ requests, selectedId, onSelect }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {requests.map((req) => {
        const isActive = req.id === selectedId;
        return (
          <button
            key={req.id}
            onClick={() => onSelect(req.id)}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: 8,
              border: isActive ? "2px solid #2563eb" : "1px solid #d1d5db",
              background: isActive ? "#e0ecff" : "#fff",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 600 }}>{req.title}</div>
            <div style={{ fontSize: "0.9rem", color: "#555" }}>
              Service: {req.service} · Risk: {req.riskLevel.toUpperCase()}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              Status: {req.status} · Dual control: {req.dualControl ? "Yes" : "No"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
