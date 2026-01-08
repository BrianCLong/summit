import { useEffect, useMemo, useState } from "react";
import { fetchSnapshot } from "./api";
import { CommandConsoleSnapshot } from "./types";

const cardStyle: React.CSSProperties = {
  border: "1px solid #d9e1ec",
  borderRadius: 8,
  padding: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const statusColors: Record<string, string> = {
  pass: "#0f9d58",
  fail: "#d93025",
  warning: "#f29900",
  unknown: "#6b7280",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      style={{
        background: `${statusColors[status] ?? "#6b7280"}15`,
        color: statusColors[status] ?? "#6b7280",
        padding: "4px 8px",
        borderRadius: 999,
        fontWeight: 600,
        textTransform: "uppercase",
        fontSize: 12,
      }}
    >
      {status}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}

function SummaryTable({
  rows,
}: {
  rows: Array<{ label: string; value: string | number; status?: string }>;
}) {
  return (
    <div style={cardStyle}>
      <table style={{ width: "100%", borderSpacing: 0 }}>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td style={{ padding: "6px 0", fontWeight: 600 }}>{row.label}</td>
              <td style={{ padding: "6px 0", textAlign: "right" }}>
                {row.status ? <StatusPill status={row.status} /> : row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [snapshot, setSnapshot] = useState<CommandConsoleSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const enabled =
    (import.meta.env.VITE_COMMAND_CONSOLE_ENABLED ?? "true").toLowerCase() !== "false";

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError("Command console is disabled by configuration.");
      return;
    }

    fetchSnapshot()
      .then((data) => setSnapshot(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [enabled]);

  const incidentCount = useMemo(
    () =>
      (snapshot?.incidents.gaGateFailures.length ?? 0) +
      (snapshot?.incidents.policyDenials.length ?? 0) +
      (snapshot?.incidents.killSwitchActivations.length ?? 0),
    [snapshot]
  );

  if (loading) {
    return <div style={{ padding: 24 }}>Loading command console…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: "#b42318" }}>
        <strong>Access blocked:</strong> {error}
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Summit Command Console</h1>
        <p style={{ color: "#475569", marginTop: 4 }}>
          Real-time operational visibility, governance posture, and kill-switch readiness.
        </p>
      </header>

      <Section title="Health & Status">
        <div style={gridStyle}>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>GA Gate</strong>
              <StatusPill status={snapshot.gaGate.overall} />
            </div>
            <p style={{ margin: "8px 0", color: "#475569" }}>
              Last run: {new Date(snapshot.gaGate.lastRun).toLocaleString()}
            </p>
            <ul style={{ paddingLeft: 16, margin: 0, color: "#334155" }}>
              {snapshot.gaGate.details.slice(0, 4).map((detail) => (
                <li key={`${detail.component}-${detail.message}`}>
                  <StatusPill status={detail.status} /> {detail.component}: {detail.message}
                </li>
              ))}
            </ul>
          </div>

          <SummaryTable
            rows={[
              { label: "CI (main)", value: snapshot.ci.commit, status: snapshot.ci.status },
              { label: "Updated", value: new Date(snapshot.ci.updatedAt).toLocaleString() },
              { label: "Branch", value: snapshot.ci.branch },
            ]}
          />

          <SummaryTable
            rows={[
              { label: "SLO Compliance", value: `${(snapshot.slo.compliance * 100).toFixed(2)}%` },
              {
                label: "Error Budget",
                value: `${(snapshot.slo.errorBudgetRemaining * 100).toFixed(1)}%`,
              },
              { label: "Burn Rate", value: snapshot.slo.burnRate.toFixed(2) },
            ]}
          />

          <SummaryTable
            rows={[
              { label: "LLM Tokens (agg)", value: snapshot.llm.aggregate.tokens.toLocaleString() },
              { label: "LLM Cost (agg)", value: `$${snapshot.llm.aggregate.cost.toFixed(2)}` },
              {
                label: "Dependency Risk",
                value: snapshot.dependencyRisk.topRisks[0] ?? "None",
                status: snapshot.dependencyRisk.level,
              },
            ]}
          />
        </div>
      </Section>

      <Section title="Tenant & Blast Radius">
        <div style={cardStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Tenant", "Rate limit", "Ingestion cap", "Kill switch", "Active"].map(
                  (header) => (
                    <th key={header} style={{ textAlign: "left", paddingBottom: 8 }}>
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {snapshot.tenants.map((tenant) => (
                <tr key={tenant.tenantId}>
                  <td style={{ padding: "8px 0" }}>{tenant.tenantId}</td>
                  <td>{tenant.rateLimit}</td>
                  <td>{tenant.ingestionCap}</td>
                  <td>{tenant.killSwitch ? "Armed" : "Normal"}</td>
                  <td>{tenant.active ? "Active" : "Suspended"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Incident Signals">
        <div style={{ ...cardStyle, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <strong>GA Gate Failures</strong>
            <p style={{ margin: "4px 0", color: "#475569" }}>
              {snapshot.incidents.gaGateFailures.length} recent
            </p>
          </div>
          <div>
            <strong>Policy Denials</strong>
            <p style={{ margin: "4px 0", color: "#475569" }}>
              {snapshot.incidents.policyDenials.length} in window
            </p>
          </div>
          <div>
            <strong>Kill Switches</strong>
            <p style={{ margin: "4px 0", color: "#475569" }}>
              {snapshot.incidents.killSwitchActivations.length} triggered
            </p>
          </div>
          <div>
            <strong>Open Signals</strong>
            <p style={{ margin: "4px 0", color: "#475569" }}>{incidentCount}</p>
          </div>
        </div>
      </Section>

      <Section title="Evidence & Governance">
        <div style={gridStyle}>
          <SummaryTable
            rows={[
              {
                label: "Evidence bundle",
                value: snapshot.evidence.latestBundle,
                status: snapshot.evidence.status,
              },
              { label: "Artifacts", value: snapshot.evidence.artifacts },
              {
                label: "Generated",
                value: new Date(snapshot.evidence.lastGeneratedAt).toLocaleString(),
              },
            ]}
          />

          <div style={cardStyle}>
            <strong>LLM Usage (per tenant)</strong>
            <ul style={{ paddingLeft: 16, margin: "8px 0" }}>
              {snapshot.llm.tenants.map((tenant) => (
                <li key={tenant.tenantId} style={{ marginBottom: 4 }}>
                  <StatusPill status={tenant.rateLimitStatus} /> {tenant.tenantId}:{" "}
                  {tenant.tokens.toLocaleString()} tokens (${tenant.cost.toFixed(2)})
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <footer style={{ marginTop: 24, color: "#64748b" }}>
        Generated {new Date(snapshot.generatedAt).toLocaleString()} • Internal visibility only
      </footer>
    </div>
  );
}
