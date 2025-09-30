import fetch from "node-fetch";
import { IntelAdapter, IntelItem } from "./types";

export const Sec13FAdapter: IntelAdapter = {
  name: "sec13f",
  enabled: () => (process.env.ENABLE_SEC13F || "true") === "true",
  async pollSince(sinceTs) {
    // Simple approach: pull recent 13F master index (you can replace with hosted mirror)
    // Here we treat this as a daily snapshot adapter:
    const items: IntelItem[] = [];
    // Pseudocode: fetch a preprocessed JSON you maintain for latest 13F positions deltas
    try {
      const r = await fetch(process.env.SEC13F_DELTA_URL || "https://your-bucket/13f-deltas.json");
      if (!r.ok) return [];
      const rows:any[] = await r.json();
      rows.forEach((x:any)=>{
        const ts = +new Date(x.filedAt);
        if (ts <= sinceTs) return;
        items.push({
          id: `${x.managerCik}:${x.ticker}:${x.filedAt}`,
          ts,
          source: "filing",
          title: `13F: ${x.managerName} ${x.action} ${x.sharesDelta} shares; value ≈ $${x.valueUsd?.toLocaleString?.() || x.valueUsd}`,
          url: x.filingUrl,
          ticker: x.ticker,
          company: x.company,
          summary: `${x.action} ${x.sharesDelta} shares; value ≈ $${x.valueUsd?.toLocaleString?.() || x.valueUsd}`
        });
      });
    } catch {}
    return items;
  }
};