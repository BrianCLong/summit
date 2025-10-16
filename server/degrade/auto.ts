import fetch from 'node-fetch';
export async function autoshed() {
  const prom = process.env.PROM_URL!;
  const q = 'route:latency:p95{path="/search"}';
  const v = Number(
    (
      await (
        await fetch(`${prom}/api/v1/query?query=${encodeURIComponent(q)}`)
      ).json()
    ).data.result?.[0]?.value?.[1] || '0',
  );
  if (v > 1.5)
    await fetch(process.env.FLAG_API!, {
      method: 'POST',
      body: JSON.stringify({ flag: 'ranker_v2', value: false }),
    });
}
