import fetch from "node-fetch";
import { IntelAdapter, IntelItem } from "./types";

const key = process.env.CRUNCHBASE_KEY || "";
const base = process.env.CRUNCHBASE_BASE || "https://api.crunchbase.com/api/v4";

export const CrunchbaseAdapter: IntelAdapter = {
  name: "crunchbase",
  enabled: () => !!key,
  async pollSince(sinceTs) {
    // Example: recent funding rounds
    const url = `${base}/searches/funding_rounds`;
    const body = {
      field_ids: ["identifier","announced_on","series","money_raised","investor_identifiers","organization_identifier"],
      query: [ { type: "predicate", field_id:"announced_on", operator: "gte", values: [ new Date(sinceTs).toISOString().slice(0,10) ] } ],
      limit: 50
    };
    const r = await fetch(url, { method:"POST", headers:{ "X-cb-user-key": key, "Content-Type":"application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return [];
    const j:any = await r.json();
    const items = (j.entities || []).map((fr:any):IntelItem => ({
      id: fr.identifier?.uuid || fr.identifier?.permalink || JSON.stringify(fr),
      ts: +new Date(fr.announced_on),
      source: "news",
      title: `${fr.organization_identifier?.value} raises ${fr.money_raised?.value_usd ? `$${fr.money_raised.value_usd.toLocaleString()}` : "funding"} (${fr.series || "round"})`,
      url: fr.identifier?.permalink || undefined,
      company: fr.organization_identifier?.value,
      entities: (fr.investor_identifiers||[]).map((x:any)=>x.value),
      sentiment: 0.2,
      summary: `Investors: ${(fr.investor_identifiers||[]).map((x:any)=>x.value).join(", ")}`
    }));
    return items.filter(i=>i.ts>sinceTs);
  }
};