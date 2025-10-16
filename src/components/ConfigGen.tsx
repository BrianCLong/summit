import React, { useState } from 'react';
export default function ConfigGen() {
  const [apiKey, setApiKey] = useState('IG_API_KEY');
  const [endpoint, setEndpoint] = useState('https://api.intelgraph.example');
  const env = `INTELGRAPH_API_KEY=${apiKey}\nINTELGRAPH_ENDPOINT=${endpoint}`;
  const yaml = `intelgraph:\n  apiKey: ${apiKey}\n  endpoint: ${endpoint}\n`;
  return (
    <div className="card padding--md">
      <label>
        API Key
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
      </label>
      <label>
        Endpoint
        <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
      </label>
      <h4>.env</h4>
      <pre>
        <code>{env}</code>
      </pre>
      <h4>config.yaml</h4>
      <pre>
        <code>{yaml}</code>
      </pre>
    </div>
  );
}
