import http from "http";
import crypto from "crypto";

const PORT = parseInt(process.env.PORT || "8085", 10);
const DISPATCH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const SECRET = process.env.PREVIEW_WEBHOOK_SECRET || "";
const REPO = process.env.GITHUB_REPOSITORY || "";
const WORKFLOW = process.env.PREVIEW_WORKFLOW || "preview-env.yml";

function verifySignature(body: string, signature?: string): boolean {
  if (!SECRET) return true;
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(body, "utf-8");
  const digest = `sha256=${hmac.digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

async function dispatch(action: "extend" | "destroy", pr: number) {
  if (!DISPATCH_TOKEN) throw new Error("GITHUB_TOKEN missing");
  const resp = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DISPATCH_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        ref: process.env.GITHUB_REF || "main",
        inputs: { action, pr: String(pr) },
      }),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Dispatch failed: ${resp.status} ${text}`);
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405).end();
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      if (!verifySignature(body, req.headers["x-hub-signature-256"] as string | undefined)) {
        res.writeHead(401).end("invalid signature");
        return;
      }
      const payload = JSON.parse(body);
      const action = payload.action as "extend" | "destroy";
      const pr = Number(payload.pr);
      if (!action || Number.isNaN(pr)) {
        res.writeHead(400).end("missing action/pr");
        return;
      }
      await dispatch(action, pr);
      res.writeHead(202).end("scheduled");
    } catch (err) {
      res.writeHead(500).end((err as Error).message);
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Preview extend/destroy webhook listening on ${PORT}`);
});
