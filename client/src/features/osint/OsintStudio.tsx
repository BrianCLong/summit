import React, { useState } from "react";
import { gql, useMutation } from "@apollo/client";

const START_OSINT_SCAN = gql`
  mutation StartOsintScan($target: String!) {
    startOsintScan(target: $target) {
      id
      target
      status
    }
  }
`;

const OsintStudio = () => {
  const [target, setTarget] = useState("");
  const [startOsintScan, { data, loading, error }] = useMutation(START_OSINT_SCAN);

  const handleScan = () => {
    startOsintScan({ variables: { target } });
  };

  return (
    <div>
      <h1>OSINT Studio</h1>
      <input
        type="text"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="Enter target (e.g., domain, IP)"
      />
      <button onClick={handleScan} disabled={loading}>
        {loading ? "Starting Scan..." : "Start Scan"}
      </button>

      {data && (
        <div>
          <h3>Scan Started</h3>
          <p>ID: {data.startOsintScan.id}</p>
          <p>Target: {data.startOsintScan.target}</p>
          <p>Status: {data.startOsintScan.status}</p>
        </div>
      )}

      {error && <p>Error starting scan: {error.message}</p>}
    </div>
  );
};

export default OsintStudio;
