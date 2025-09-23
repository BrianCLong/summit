import { useEffect, useState } from "react";

export default function useThreatInsights() {
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchInsights() {
      try {
        const res = await fetch("/threat/insights?target=global");
        if (!res.ok || !active) return;
        const data = await res.json();
        if (active) setInsights(data);
      } catch (e) {
        // ignore fetch errors for polling
      }
    }

    fetchInsights();
    const id = setInterval(fetchInsights, 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return insights;
}
