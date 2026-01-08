import { AuditEvent } from "./types";

type Props = {
  events: AuditEvent[];
  correlationId: string;
};

/**
 * Timeline showing correlated audit events for an approval request.
 */
export function AuditTimeline({ events, correlationId }: Props) {
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>Audit timeline</h3>
        <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Correlation: {correlationId}</span>
      </div>
      <ol style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 0 0" }}>
        {sorted.map((event) => (
          <li
            key={event.id}
            style={{
              padding: "0.5rem 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ fontWeight: 600 }}>{event.title}</div>
            <div style={{ fontSize: "0.9rem", color: "#4b5563" }}>{event.description}</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              {new Date(event.timestamp).toLocaleString()} · {event.type}
              {event.actor ? ` · actor: ${event.actor}` : ""}
              {event.tags?.length ? ` · tags: ${event.tags.join(", ")}` : ""}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
