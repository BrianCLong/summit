const { useEffect, useState } = React;

function App() {
  const [spacesConfig, setSpacesConfig] = useState([]);
  const [spaceData, setSpaceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("./config.json")
      .then(r => r.json())
      .then(cfg => {
        setSpacesConfig(cfg.spaces);
        setLoading(false);
      })
      .catch(e => {
        setError("Failed to load config.json: " + e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (spacesConfig.length === 0) return;

    const fetchSpaceData = async (space) => {
      const spaceUrl = `https://huggingface.co/spaces/${space.user}/${space.name}`;
      let metrics = null;
      let metricsError = null;

      if (space.type === "docker") {
        try {
          const metricsResp = await fetch(`${spaceUrl}/metrics`);
          if (!metricsResp.ok) throw new Error(`HTTP ${metricsResp.status}`);
          metrics = await metricsResp.json();
        } catch (e) {
          metricsError = "Failed to fetch metrics: " + e.message;
        }
      }

      setSpaceData(prev => ({
        ...prev,
        [space.name]: { url: spaceUrl, metrics, metricsError, ...space }
      }));
    };

    spacesConfig.forEach(space => fetchSpaceData(space));

    // Poll metrics every 10 seconds
    const interval = setInterval(() => {
      spacesConfig.forEach(space => fetchSpaceData(space));
    }, 10000);

    return () => clearInterval(interval);
  }, [spacesConfig]);

  if (loading) return <p>Loading documentation portal...</p>;
  if (error) return <p style={{color: 'red'}}>Error: {error}</p>;

  return (
    <section>
      <hgroup>
        <h1>Summit Documentation Portal</h1>
        <p>Overview of deployed Hugging Face Spaces for Summit.</p>
      </hgroup>

      {spacesConfig.map(space => (
        <div key={space.name} className="space-card">
          <h2><a href={`https://huggingface.co/spaces/${space.user}/${space.name}`} target="_blank" rel="noopener noreferrer">{space.name}</a></h2>
          <p>Type: {space.type}</p>
          {spaceData[space.name]?.metrics && (
            <>
              <h3>Metrics</h3>
              <pre>{JSON.stringify(spaceData[space.name].metrics, null, 2)}</pre>
              {space.type === "docker" && spaceData[space.name].metrics.endpoint_metrics && (
                <>
                  <h4>Endpoint Metrics:</h4>
                  <ul>
                    {Object.entries(spaceData[space.name].metrics.endpoint_metrics).map(([endpoint, data]) => (
                      <li key={endpoint}>
                        <strong>{endpoint}:</strong> Requests: {data.request_count}, Avg Latency: {data.average_latency_seconds.toFixed(4)}s
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          {spaceData[space.name]?.metricsError && (
            <p style={{color: 'orange'}}>Warning: {spaceData[space.name].metricsError}</p>
          )}
        </div>
      ))}
    </section>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
