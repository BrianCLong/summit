import fetch from "node-fetch";
import { IntelAdapter, IntelItem } from "./types";

const key = process.env.NEWSAPI_KEY || "";

export const NewsApiAdapter: IntelAdapter = {
  name: "newsapi",
  enabled: () => !!key,
  async pollSince(sinceTs) {
    const q = encodeURIComponent(process.env.NEWSAPI_QUERY || "AI OR cloud OR enterprise software");
    const url = `https://newsapi.org/v2/everything?q=${q}&pageSize=50&sortBy=publishedAt&apiKey=${key}`;
    const r = await fetch(url); if (!r.ok) return [];
    const j = await r.json();
    return (j.articles || []).map((a: any): IntelItem => ({
      id: a.url,
      ts: +new Date(a.publishedAt),
      source: 'news',
      title: a.title,
      url: a.url,
      company: undefined,
      sentiment: 0, // fill with your sentiment pipeline
      summary: a.description
    })).filter(i => i.ts > sinceTs);
  }
};