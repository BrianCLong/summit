export async function ingest(payload: { source: string; content: string; actorId: string }) {
  const r = await fetch("/api/ingest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {throw new Error(await r.text());}
  return r.json();
}

export async function getGraph() {
  const r = await fetch("/api/graph");
  return r.json();
}

export async function getReceipts() {
  const r = await fetch("/api/receipts");
  return r.json();
}

export async function getDecisions() {
  const r = await fetch("/api/decisions");
  return r.json();
}
