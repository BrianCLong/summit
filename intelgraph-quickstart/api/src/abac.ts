import fetch from "node-fetch";
export async function allow(subject: any, action: string, resource: any): Promise<boolean> {
  const url = process.env.OPA_URL!;
  const input = { input: { subject, action, resource } };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return false;
  const data: any = await res.json();
  return Boolean(data.result === true || data.result?.allow === true);
}
