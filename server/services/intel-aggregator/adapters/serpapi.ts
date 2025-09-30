import fetch from "node-fetch";
import { IntelAdapter, IntelItem } from "./types";
const key = process.env.SERPAPI_KEY || "";

export const SerpAdapter: IntelAdapter = {
  name: "serpapi",
  enabled: () => !!key,
  async pollSince(sinceTs) {
    const q = encodeURIComponent(process.env.SERPAPI_QUERY || "site:seekingalpha.com competitor OR \"launches\"");
    const url = `https://serpapi.com/search.json?engine=google&q=${q}&api_key=${key}`;
    const r = await fetch(url); if (!r.ok) return [];
    const j = await r.json();
    return (j.organic_results || []).map((o:any):IntelItem=>({
      id: o.link,
      ts: Date.now(), // Serp often lacks exact pub time
      source:'web',
      title:o.title,
      url:o.link,
      summary:o.snippet
    })).filter(i=>i.ts>sinceTs);
  }
};
