import { useEffect, useState } from "react";
import axios from "axios";

type DisclosurePackListItem = {
  id: string;
  tenant_id: string;
  product: string;
  environment: string;
  build_id: string;
  generated_at: string;
  residency_region?: string;
  vuln_summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
};

function App() {
  const [items, setItems] = useState<DisclosurePackListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPacks() {
      const res = await axios.get("/api/disclosure-packs");
      setItems(res.data.items ?? []);
    }
    loadPacks();
  }, []);

  async function downloadSelected() {
    if (!selectedId) return;
    try {
      const res = await axios.get(`/api/disclosure-packs/${selectedId}/export`, {
        responseType: "blob"
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `disclosure-${selectedId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(
        `Export failed: ${
          e?.response?.data?.reason ??
          e?.response?.data?.error ??
          e?.message ??
          "unknown error"
        }`
      );
    }
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Compliance Console</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Product</th>
            <th>Environment</th>
            <th>Region</th>
            <th>Generated</th>
            <th>Crit</th>
            <th>High</th>
            <th>Med</th>
            <th>Low</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} onClick={() => setSelectedId(i.id)}>
              <td>{i.id}</td>
              <td>{i.product}</td>
              <td>{i.environment}</td>
              <td>{i.residency_region ?? "us"}</td>
              <td>{i.generated_at}</td>
              <td>{i.vuln_summary.critical}</td>
              <td>{i.vuln_summary.high}</td>
              <td>{i.vuln_summary.medium}</td>
              <td>{i.vuln_summary.low}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={downloadSelected} disabled={!selectedId}>
        Download JSON
      </button>
    </div>
  );
}

export default App;
