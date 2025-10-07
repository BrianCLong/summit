const { useEffect, useState } = React;

function App() {
  const [apiBase, setApiBase] = useState("");
  const [entity, setEntity] = useState("ACME");
  const [token, setToken] = useState(localStorage.getItem("hf_token") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("graphql"); // 'graphql' or 'metrics'

  useEffect(() => {
    fetch("./config.json")
      .then(r => r.json())
      .then(cfg => setApiBase(cfg.apiBase || ""))
      .catch(() => setError("Failed to load config.json"));
  }, []);

  useEffect(() => {
    localStorage.setItem("hf_token", token);
  }, [token]);

  const runQuery = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      if (!apiBase) throw new Error("apiBase missing in config.json");
      const query = `
        query Investigate($id: ID!) {
          entity(id: $id) { id label type }
          neighbors(id: $id) { id label type edgeLabel }
        }`;
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/graphql`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ query, variables: { id: entity } })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setResult(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const MetricsTab = () => {
    const [metrics, setMetrics] = useState(null);
    const [metricsError, setMetricsError] = useState("");
    const [metricsLoading, setMetricsLoading] = useState(false);

    useEffect(() => {
      if (!apiBase) return;
      setMetricsLoading(true);
      fetch(`${apiBase.replace(/\/+$/, "")}/metrics`)
        .then(r => r.json())
        .then(setMetrics)
        .catch(e => setMetricsError(String(e)))
        .finally(() => setMetricsLoading(false));
    }, [apiBase]);

    return (
      <article>
        <h2>Metrics</h2>
        {metricsLoading && <p>Loading metrics...</p>}
        {metricsError && <p style={{color: 'red'}}>Error loading metrics: {metricsError}</p>}
        {metrics && (
          <pre>{JSON.stringify(metrics, null, 2)}</pre>
        )}
      </article>
    );
  };

  return (
    <section>
      <hgroup>
        <h1>Summit UI (Static)</h1>
        <p>Remote API: <code>{apiBase || "(configure ./config.json)"}</code></p>
      </hgroup>

      <nav>
        <ul>
          <li><a href="#" onClick={() => setActiveTab("graphql")} className={activeTab === "graphql" ? "secondary" : ""}>GraphQL</a></li>
          <li><a href="#" onClick={() => setActiveTab("metrics")} className={activeTab === "metrics" ? "secondary" : ""}>Metrics</a></li>
        </ul>
      </nav>

      {activeTab === "graphql" && (
        <>
          <div className="row">
            <input value={entity} onChange={e=>setEntity(e.target.value)} placeholder="Entity ID (e.g., ACME)" />
            <button onClick={runQuery} disabled={loading || !apiBase}>
              {loading ? "Querying..." : "Query GraphQL"}
            </button>
          </div>

          <div className="row">
            <input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="Authorization Token (Bearer)" style={{flex: '3'}} />
            <button onClick={() => setToken("")} className="secondary" style={{flex: '1'}}>Clear Token</button>
          </div>

          {error && <article style={{borderColor:"#c33"}}><b>Error:</b> {error}</article>}
          {result && (
            <>
              <h3>Result</h3>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </>
          )}
          <details>
            <summary>Example GraphQL</summary>
            <pre>{`POST ${apiBase || "https://your-api"}/graphql
{"query":"query Investigate($id: ID!){ entity(id:$id){id label} }","variables":{"id":"ACME"}}`}</pre>
          </details>
        </>
      )}

      {activeTab === "metrics" && <MetricsTab />}
    </section>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
