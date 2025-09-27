import React, { useEffect, useState } from "react";
import { Configuration, DefaultApi } from "@intelgraph/sdk";

/**
 * Minimal page to verify SDK calls against the stub API.
 * Renders results from /v1/health, /v1/auth/me, /v1/prov/claims.
 */
const ApiSmoke: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [authMe, setAuthMe] = useState<any>(null);
  const [claims, setClaims] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const api = new DefaultApi(
    new Configuration({
      basePath: process.env.REACT_APP_API_BASE || "http://localhost:8080"
    })
  );

  useEffect(() => {
    (async () => {
      try {
        const h = await api.healthGet();
        setHealth(h as any);
      } catch (e: any) {
        setError(e?.message || "health error");
      }

      try {
        // NOTE: These stubs return 501 intentionally.
        // We call them just to prove SDK methods exist and wire correctly.
        await api.authMeGet(); // will throw due to 501
      } catch (e: any) {
        setAuthMe({ status: 501, note: "stub reachable" });
      }

      try {
        await api.provClaimsGet(); // will throw due to 501
      } catch (e: any) {
        setClaims({ status: 501, note: "stub reachable" });
      }
    })();
  }, []); // eslint-disable-line

  return (
    <div style={{ padding: 24, fontFamily: "Inter, system-ui, Arial" }}>
      <h1>IntelGraph API Smoke</h1>

      <section>
        <h2>/v1/health</h2>
        <pre>{JSON.stringify(health, null, 2)}</pre>
      </section>

      <section>
        <h2>/v1/auth/me</h2>
        <pre>{JSON.stringify(authMe, null, 2)}</pre>
      </section>

      <section>
        <h2>/v1/prov/claims</h2>
        <pre>{JSON.stringify(claims, null, 2)}</pre>
      </section>

      {error && (
        <section>
          <h2>Errors</h2>
          <pre>{error}</pre>
        </section>
      )}
    </div>
  );
};

export default ApiSmoke;