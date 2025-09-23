import fetch from 'node-fetch';

export async function evaluateOPA(policyPath: string, input: any): Promise<{ allow: boolean; reason?: string }> {
  const url = process.env.OPA_URL;
  if (!url) return { allow: true };
  try {
    const res = await fetch(`${url}/v1/data/${policyPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    const json: any = await res.json();
    const allow = Boolean(json?.result?.allow ?? json?.result === true);
    const reason = json?.result?.reason || undefined;
    return { allow, reason };
  } catch {
    // Fail-open by default to avoid blocking operations when OPA unavailable
    return { allow: true };
  }
}

