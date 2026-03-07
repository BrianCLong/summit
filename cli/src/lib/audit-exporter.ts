import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface AuditExportOptions {
  customer: string;
  from?: string;
  to?: string;
  storePath?: string;
  outputDir?: string;
  signingKeyPath?: string;
}

export interface AuditRecord {
  sequence: number;
  recorded_at: string;
  prev_hash: string;
  payload_hash: string;
  hash: string;
  event: {
    version: string;
    actor: { type: string; id?: string; name?: string; ip_address?: string };
    action: string;
    resource: { type: string; id?: string; name?: string; owner?: string };
    classification: "public" | "internal" | "confidential" | "restricted";
    policy_version: string;
    decision_id: string;
    trace_id: string;
    timestamp: string;
    customer?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface Manifest {
  version: "audit-export-v1";
  customer: string;
  from?: string;
  to?: string;
  exported_at: string;
  events_file: string;
  event_count: number;
  hash_chain: {
    start: string;
    end: string | undefined;
    valid: boolean;
  };
  redaction_rules: string[];
  public_key: string;
  signature?: string;
}

const hashRecord = (
  record: Pick<AuditRecord, "sequence" | "recorded_at" | "prev_hash" | "payload_hash">
) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        sequence: record.sequence,
        recorded_at: record.recorded_at,
        prev_hash: record.prev_hash,
        payload_hash: record.payload_hash,
      })
    )
    .digest("hex");

const defaultStorePath = () =>
  process.env.AUDIT_EVENT_STORE ?? path.join(process.cwd(), "logs", "audit", "audit-events.jsonl");

const defaultOutputDir = () => path.join(process.cwd(), "audit-exports");

const ensureDir = async (dir: string) => {
  await fs.promises.mkdir(dir, { recursive: true });
};

const parseEvents = async (storePath: string): Promise<AuditRecord[]> => {
  if (!fs.existsSync(storePath)) return [];
  const contents = await fs.promises.readFile(storePath, "utf8");
  return contents
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRecord);
};

const redactEvent = (event: AuditRecord["event"]): AuditRecord["event"] => {
  const base = { ...event, actor: { ...event.actor }, resource: { ...event.resource } };

  switch (event.classification) {
    case "public":
      return base;
    case "internal":
      delete base.actor.ip_address;
      return base;
    case "confidential":
      delete base.actor.ip_address;
      delete base.actor.id;
      delete base.resource.id;
      delete base.resource.owner;
      return base;
    case "restricted":
      return {
        version: event.version,
        actor: { type: event.actor.type },
        action: event.action,
        resource: { type: event.resource.type },
        classification: event.classification,
        policy_version: event.policy_version,
        decision_id: event.decision_id,
        trace_id: event.trace_id,
        timestamp: event.timestamp,
        customer: event.customer,
        metadata: event.metadata ? { redacted: true } : undefined,
      };
    default:
      return base;
  }
};

export const verifyChain = (records: AuditRecord[], expectedStart = "GENESIS") => {
  let expectedPrev = expectedStart;
  for (const record of records) {
    const computed = hashRecord({
      sequence: record.sequence,
      recorded_at: record.recorded_at,
      prev_hash: record.prev_hash,
      payload_hash: record.payload_hash,
    });
    if (computed !== record.hash || record.prev_hash !== expectedPrev) {
      return false;
    }
    expectedPrev = record.hash;
  }
  return true;
};

const signManifest = (data: Omit<Manifest, "signature">, signingKey?: string) => {
  const privateKey =
    signingKey ??
    crypto
      .generateKeyPairSync("ed25519")
      .privateKey.export({ type: "pkcs8", format: "pem" })
      .toString();
  const sign = crypto.sign(null, Buffer.from(JSON.stringify(data)), privateKey);
  const publicKey = crypto
    .createPublicKey(privateKey)
    .export({ type: "spki", format: "pem" })
    .toString();
  return { signature: sign.toString("base64"), publicKey };
};

export const verifySignature = (manifest: Manifest, publicKey?: string): boolean => {
  const { signature, public_key: manifestPublicKey, ...rest } = manifest;
  if (!signature) return false;
  const key = publicKey ?? manifestPublicKey;
  // The original data was signed with public_key: '' so we need to match that
  const unsigned = { ...rest, public_key: "" };
  return crypto.verify(
    null,
    Buffer.from(JSON.stringify(unsigned)),
    key,
    Buffer.from(signature, "base64")
  );
};

export class AuditExporter {
  async export(options: AuditExportOptions): Promise<{ manifest: Manifest; directory: string }> {
    const storePath = options.storePath ?? defaultStorePath();
    const outputDir = options.outputDir ?? defaultOutputDir();
    await ensureDir(outputDir);

    const events = await parseEvents(storePath);
    const fromTime = options.from ? new Date(options.from).getTime() : null;
    const toTime = options.to ? new Date(options.to).getTime() : null;
    const filtered = events.filter((record) => {
      const ts = new Date(record.event.timestamp).getTime();
      const matchesCustomer = record.event.customer === options.customer;
      const afterFrom = fromTime !== null ? ts >= fromTime : true;
      const beforeTo = toTime !== null ? ts <= toTime : true;
      return matchesCustomer && afterFrom && beforeTo;
    });

    const redacted = filtered.map((record) => ({ ...record, event: redactEvent(record.event) }));
    const chainStart = filtered[0]?.prev_hash ?? "GENESIS";
    const chainValid = verifyChain(filtered, chainStart);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const directory = path.join(outputDir, `audit-export-${options.customer}-${timestamp}`);
    await ensureDir(directory);

    const eventsFile = path.join(directory, "events.jsonl");
    const manifestFile = path.join(directory, "manifest.json");
    const unsignedManifest: Omit<Manifest, "signature"> = {
      version: "audit-export-v1",
      customer: options.customer,
      from: options.from,
      to: options.to,
      exported_at: new Date().toISOString(),
      events_file: "events.jsonl",
      event_count: redacted.length,
      hash_chain: {
        start: chainStart,
        end: filtered[filtered.length - 1]?.hash,
        valid: chainValid,
      },
      redaction_rules: [
        "internal: drop actor.ip_address",
        "confidential: drop actor identifiers and owner metadata",
        "restricted: keep only types and decision identifiers; metadata flagged as redacted",
      ],
      public_key: "",
    };

    const signingKey = options.signingKeyPath
      ? await fs.promises.readFile(options.signingKeyPath, "utf8")
      : undefined;
    const { signature, publicKey } = signManifest(unsignedManifest, signingKey);
    const manifest: Manifest = { ...unsignedManifest, signature, public_key: publicKey };

    await fs.promises.writeFile(
      eventsFile,
      redacted.map((record) => JSON.stringify(record)).join("\n") + "\n",
      "utf8"
    );
    await fs.promises.writeFile(manifestFile, JSON.stringify(manifest, null, 2), "utf8");
    await fs.promises.writeFile(
      path.join(directory, "manifest.sig"),
      manifest.signature ?? "",
      "utf8"
    );

    if (options.signingKeyPath) {
      const publicPath = path.join(directory, "public.pem");
      await fs.promises.writeFile(publicPath, publicKey, "utf8");
    }

    return { manifest, directory };
  }
}
