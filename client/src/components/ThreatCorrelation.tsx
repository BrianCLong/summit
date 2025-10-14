import React, { useState, useEffect, useRef } from "react";
import { useMutation, gql } from "@apollo/client"; // Assuming Apollo Client is set up
import cytoscape, { Core } from "cytoscape";

const CORRELATE_THREATS_MUTATION = gql`
  mutation CorrelateThreats($osintInput: JSON!) {
    correlateThreats(osintInput: $osintInput) {
      prioritized_map
      confidence
      note
    }
  }
`;

const ThreatCorrelation: React.FC = () => {
  const [osintData, setOsintData] = useState("");
  const [correlateThreats, { data, loading, error }] = useMutation(
    CORRELATE_THREATS_MUTATION,
  );
  const cyContainer = useRef<HTMLDivElement | null>(null);
  const cyInstance = useRef<Core | null>(null);

  const handleSubmit = async () => {
    try {
      const parsedOsintData = JSON.parse(osintData);
      await correlateThreats({ variables: { osintInput: parsedOsintData } });
    } catch (e) {
      alert("Invalid JSON input for OSINT data.");
      console.error(e);
    }
  };

  useEffect(() => {
    if (data && cyContainer.current) {
      const prioritizedMap = data.correlateThreats?.prioritized_map || {};
      const keys = Object.keys(prioritizedMap);
      const elements = [
        ...keys.map((id) => ({ data: { id } })),
        ...keys.slice(1).map((id, idx) => ({
          data: { id: `${keys[idx]}-${id}`, source: keys[idx], target: id },
        })),
      ];

      if (cyInstance.current) {
        cyInstance.current.destroy();
      }

      cyInstance.current = cytoscape({
        container: cyContainer.current,
        elements,
        layout: { name: "grid" },
        style: [
          {
            selector: "node",
            style: { "background-color": "#0074D9", label: "data(id)" },
          },
        ],
      });

      (window as any).cy = cyInstance.current;
    }
  }, [data]);

  return (
    <div className="threat-correlation">
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows={6}
        placeholder="Enter OSINT data in JSON format (e.g., { 'events': [{ 'region': '...', 'actor': '...', 'theme': '...', 'event_id': '...', 'timestamp': '...' }] })"
        value={osintData}
        onChange={(e) => setOsintData(e.target.value)}
      ></textarea>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Correlating..." : "Run Threat Correlation"}
      </button>

      {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
      {data && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Correlation Results:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(data.correlateThreats, null, 2)}
          </pre>
          <div ref={cyContainer} style={{ height: 300 }} />
        </div>
      )}
    </div>
  );
};

export default ThreatCorrelation;
