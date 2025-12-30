import React from "react";
import { ingest, getGraph, getReceipts, getDecisions } from "./api";

export default function App() {
  const [source, setSource] = React.useState("manual");
  const [actorId, setActorId] = React.useState("local-user");
  const [content, setContent] = React.useState("");
  const [graph, setGraph] = React.useState<any>({ nodes: [], edges: [] });
  const [receipts, setReceipts] = React.useState<any[]>([]);
  const [decisions, setDecisions] = React.useState<any[]>([]);
  const [status, setStatus] = React.useState<string>("");

  async function refresh() {
    const [g, r, d] = await Promise.all([getGraph(), getReceipts(), getDecisions()]);
    setGraph(g);
    setReceipts(r);
    setDecisions(d);
  }

  React.useEffect(() => {
    refresh().catch(() => void 0);
  }, []);

  async function onIngest() {
    setStatus("Ingesting…");
    try {
      await ingest({ source, content, actorId });
      setContent("");
      await refresh();
      setStatus("Done.");
    } catch (e: any) {
      setStatus(`Error: ${e?.message ?? String(e)}`);
    }
  }

  return (
    <div style={{ fontFamily: "ui-sans-serif", padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Summit Mini</h1>
      <p style={{ opacity: 0.8 }}>Graph + receipts + policy decisions (standalone demo)</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h2>Ingest</h2>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="source" style={{ flex: 1 }} />
            <input value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="actorId" style={{ flex: 1 }} />
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste text here…"
            rows={10}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <button onClick={onIngest} disabled={!content.trim()}>
              Create receipt + decision
            </button>
            <button onClick={() => refresh()}>Refresh</button>
            <span style={{ opacity: 0.8 }}>{status}</span>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h2>Graph</h2>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <h3>Nodes ({graph.nodes?.length ?? 0})</h3>
              <ul style={{ maxHeight: 220, overflow: "auto" }}>
                {(graph.nodes ?? []).slice(0, 50).map((n: any) => (
                  <li key={n.id}>
                    <code>{n.label}</code> <span style={{ opacity: 0.7 }}>({n.kind}, score {n.score})</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: 1 }}>
              <h3>Edges ({graph.edges?.length ?? 0})</h3>
              <ul style={{ maxHeight: 220, overflow: "auto" }}>
                {(graph.edges ?? []).slice(0, 50).map((e: any) => (
                  <li key={e.id}>
                    <code>{e.kind}</code> <span style={{ opacity: 0.7 }}>{e.src} → {e.dst}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h2>Receipts (latest)</h2>
          <pre style={{ maxHeight: 320, overflow: "auto", fontSize: 12 }}>
            {JSON.stringify(receipts?.[0]?.receipt ?? null, null, 2)}
          </pre>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h2>Policy decisions (latest)</h2>
          <pre style={{ maxHeight: 320, overflow: "auto", fontSize: 12 }}>
            {JSON.stringify(decisions?.[0]?.decision ?? null, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
