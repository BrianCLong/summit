import { useEffect, useState } from "react";

interface Prediction {
  source: number;
  target: number;
  confidence: number;
}

export default function SuggestedConnectionsPanel() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    fetch("/ai/gnn/link-predictions")
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...data].sort((a, b) => b.confidence - a.confidence);
        setPredictions(sorted);
      });
  }, []);

  const handleAction = (p: Prediction, accepted: boolean) => {
    fetch("/ai/gnn/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, accepted }),
    });
    setPredictions((prev) =>
      prev.filter((s) => !(s.source === p.source && s.target === p.target)),
    );
  };

  return (
    <div>
      <h3>Suggested Connections</h3>
      <ul>
        {predictions.map((p) => (
          <li key={`${p.source}-${p.target}`}>
            {p.source} ➜ {p.target} ({p.confidence.toFixed(2)})
            <button onClick={() => handleAction(p, true)}>Confirm</button>
            <button onClick={() => handleAction(p, false)}>Deny</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
