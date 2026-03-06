export async function ingestFixtures() {
  const r = await fetch("/api/eis/ingest-fixtures", { method: "POST" });
  if (!r.ok) throw new Error(`ingestFixtures failed: ${r.status}`);
  return r.json();
}

export async function listQuarantineCases() {
  const r = await fetch("/api/eis/quarantine");
  if (!r.ok) throw new Error(`listQuarantineCases failed: ${r.status}`);
  return r.json();
}
