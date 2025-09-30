import fetch from "node-fetch";
import { IntelAdapter, IntelItem } from "./types";
import { parseStringPromise } from "xml2js";

let cikCache: Record<string,{ticker?:string, company?:string}> = {};
async function ensureCikCache(){
  if (Object.keys(cikCache).length) return;
  // Lightweight daily mapping (SEC provides bulk; here we use a simple JSON you maintain)
  try {
    const r = await fetch(process.env.CIK_TICKER_URL || "https://your-bucket/cik-ticker.json");
    if (r.ok) cikCache = await r.json();
  } catch {}
}

export const EdgarAdapter: IntelAdapter = {
  name: "edgar",
  enabled: () => true,
  async pollSince(sinceTs) {
    await ensureCikCache();
    const url = "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&company=&dateb=&owner=exclude&start=0&count=100&output=atom";
    const r = await fetch(url, { headers: { "User-Agent": process.env.EDGAR_UA || "CompanyOS/1.0 contact@example.com" }});
    if (!r.ok) return [];
    const xml = await r.text();
    const feed = await parseStringPromise(xml);
    const entries = feed.feed?.entry || [];
    return entries.map((e:any):IntelItem=>{
      const title = e.title?.[0] || "";
      const updated = e.updated?.[0];
      const link = e.link?.[0]?.$.href;
      const cikMatch = title.match(/\(CIK|cik\s*(\d+)\)/);
      const cik = cikMatch?.[2] || "";
      const meta = cikCache[cik] || {};
      return {
        id: link,
        ts: +new Date(updated),
        source: "filing",
        title,
        url: link,
        ticker: meta.ticker,
        company: meta.company,
        summary: undefined
      };
    }).filter(i=>i.ts>sinceTs);
  }
};