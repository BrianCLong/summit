import { createHash } from "crypto";

export interface Range {
  start: number;
  end: number;
}

export interface Event {
  index: number;
  timestamp: string;
  payload: string;
}

export interface BlockHeader {
  index: number;
  startIndex: number;
  endIndex: number;
  merkleRoot: string;
  digest: string;
  prevDigest: string;
}

export interface MerkleProof {
  leafDigest: string;
  siblingDigests: string[];
  pathBits: number[];
}

export interface BlockProof {
  header: BlockHeader;
  events: Event[];
  proofs: MerkleProof[];
}

export interface RangeProof {
  query: Range;
  blocks: BlockProof[];
  startAnchor: string;
  headDigest: string;
}

export interface EventProof {
  index: number;
  event: Event;
  block: BlockProof;
  headDigest: string;
}

export interface GapProof {
  start: number;
  end: number;
  left: BlockHeader;
  right: BlockHeader;
  headDigest: string;
}

export interface VerificationResult {
  headDigest: string;
  coveredRange: Range;
  startAnchor: string;
}

export interface AlspTransport {
  proveRange(range: Range): Promise<RangeProof>;
  proveEvent(index: number): Promise<EventProof>;
  proveGap(start: number, end: number): Promise<GapProof>;
}

export class HttpTransport implements AlspTransport {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly baseUrl: string, fetchImpl?: typeof fetch) {
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("fetch implementation is required in this environment");
    }
  }

  async proveRange(range: Range): Promise<RangeProof> {
    return this.post<RangeProof>("/proveRange", range);
  }

  async proveEvent(index: number): Promise<EventProof> {
    return this.post<EventProof>("/proveEvent", { index });
  }

  async proveGap(start: number, end: number): Promise<GapProof> {
    return this.post<GapProof>("/proveGap", { start, end });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`ALSP transport error: ${response.status}`);
    }
    return (await response.json()) as T;
  }
}

export class MemoryTransport implements AlspTransport {
  private rangeProofs = new Map<string, RangeProof>();
  private eventProofs = new Map<number, EventProof>();
  private gapProofs = new Map<string, GapProof>();

  setRangeProof(range: Range, proof: RangeProof): void {
    this.rangeProofs.set(rangeKey(range), proof);
  }

  setEventProof(index: number, proof: EventProof): void {
    this.eventProofs.set(index, proof);
  }

  setGapProof(start: number, end: number, proof: GapProof): void {
    this.gapProofs.set(rangeKey({ start, end }), proof);
  }

  async proveRange(range: Range): Promise<RangeProof> {
    const proof = this.rangeProofs.get(rangeKey(range));
    if (!proof) {
      throw new Error("no cached range proof available");
    }
    return proof;
  }

  async proveEvent(index: number): Promise<EventProof> {
    const proof = this.eventProofs.get(index);
    if (!proof) {
      throw new Error("no cached event proof available");
    }
    return proof;
  }

  async proveGap(start: number, end: number): Promise<GapProof> {
    const proof = this.gapProofs.get(rangeKey({ start, end }));
    if (!proof) {
      throw new Error("no cached gap proof available");
    }
    return proof;
  }
}

export class AlspVerifier {
  private anchor?: string;

  constructor(anchor?: string) {
    this.anchor = anchor;
  }

  verifyRange(proof: RangeProof): VerificationResult {
    validateRange(proof.query);
    if (!proof.blocks.length) {
      throw new Error("range proof missing blocks");
    }
    this.ensureAnchor(proof.headDigest);
    if (!equalDigests(proof.startAnchor, proof.blocks[0].header.prevDigest)) {
      throw new Error("range start anchor mismatch");
    }

    const covered: number[] = [];
    let previousHeader: BlockHeader | undefined;
    for (const block of proof.blocks) {
      this.validateBlock(block, previousHeader);
      for (let i = 0; i < block.events.length; i += 1) {
        const event = block.events[i];
        const membership = block.proofs[i];
        const digest = digestEvent(event);
        if (!equalDigests(encodeDigest(digest), membership.leafDigest)) {
          throw new Error("event digest mismatch");
        }
        if (!verifyMerkleProof(block.header.merkleRoot, membership)) {
          throw new Error("invalid merkle proof");
        }
        covered.push(event.index);
      }
      previousHeader = block.header;
    }
    ensureCoverage(proof.query, covered);
    this.anchor = proof.headDigest;
    return { headDigest: proof.headDigest, coveredRange: proof.query, startAnchor: proof.startAnchor };
  }

  verifyEvent(proof: EventProof): VerificationResult {
    this.ensureAnchor(proof.headDigest);
    if (proof.block.events.length !== 1 || proof.block.proofs.length !== 1) {
      throw new Error("event proof must contain a single membership witness");
    }
    this.validateBlock(proof.block);
    const event = proof.block.events[0];
    if (event.index !== proof.index) {
      throw new Error("event index mismatch");
    }
    const digest = digestEvent(event);
    if (!equalDigests(encodeDigest(digest), proof.block.proofs[0].leafDigest)) {
      throw new Error("event digest mismatch");
    }
    if (!verifyMerkleProof(proof.block.header.merkleRoot, proof.block.proofs[0])) {
      throw new Error("invalid merkle proof");
    }
    this.anchor = proof.headDigest;
    return {
      headDigest: proof.headDigest,
      coveredRange: { start: proof.index, end: proof.index },
      startAnchor: proof.block.header.prevDigest,
    };
  }

  verifyGap(proof: GapProof): VerificationResult {
    if (proof.end < proof.start) {
      throw new Error("invalid gap range");
    }
    this.ensureAnchor(proof.headDigest);
    validateHeader(proof.left);
    validateHeader(proof.right);
    if (proof.right.index !== proof.left.index + 1) {
      throw new Error("gap proof requires consecutive blocks");
    }
    if (!equalDigests(proof.right.prevDigest, proof.left.digest)) {
      throw new Error("gap proof digest chain mismatch");
    }
    if (proof.start <= proof.left.endIndex) {
      throw new Error("gap start overlaps left block");
    }
    if (proof.end >= proof.right.startIndex) {
      throw new Error("gap end overlaps right block");
    }
    this.anchor = proof.headDigest;
    return { headDigest: proof.headDigest, coveredRange: { start: proof.start, end: proof.end }, startAnchor: proof.left.prevDigest };
  }

  private validateBlock(block: BlockProof, previous?: BlockHeader): void {
    validateHeader(block.header);
    if (block.events.length !== block.proofs.length) {
      throw new Error("membership proof count mismatch");
    }
    if (previous) {
      if (!equalDigests(block.header.prevDigest, previous.digest)) {
        throw new Error("block chain digest mismatch");
      }
      if (block.header.startIndex <= previous.endIndex) {
        throw new Error("block event indices must increase");
      }
    }
  }

  private ensureAnchor(digest: string): void {
    if (!this.anchor) {
      this.anchor = digest;
      return;
    }
    if (!equalDigests(this.anchor, digest)) {
      throw new Error("head digest mismatch");
    }
  }
}

export interface ClientResult<TProof> {
  proof: TProof;
  verification: VerificationResult;
}

export class AlspClient {
  constructor(private readonly transport: AlspTransport, private readonly verifier: AlspVerifier) {}

  async proveRange(range: Range): Promise<ClientResult<RangeProof>> {
    const proof = await this.transport.proveRange(range);
    const verification = this.verifier.verifyRange(proof);
    return { proof, verification };
  }

  async proveEvent(index: number): Promise<ClientResult<EventProof>> {
    const proof = await this.transport.proveEvent(index);
    const verification = this.verifier.verifyEvent(proof);
    return { proof, verification };
  }

  async proveGap(start: number, end: number): Promise<ClientResult<GapProof>> {
    const proof = await this.transport.proveGap(start, end);
    const verification = this.verifier.verifyGap(proof);
    return { proof, verification };
  }
}

export type ReplayEntry =
  | { type: "range"; proof: RangeProof }
  | { type: "event"; proof: EventProof }
  | { type: "gap"; proof: GapProof };

export interface ReplayOutcome {
  entry: ReplayEntry;
  result?: VerificationResult;
  error?: Error;
}

export class ReplaySession {
  constructor(private readonly verifier: AlspVerifier) {}

  replay(entries: ReplayEntry[]): ReplayOutcome[] {
    const outcomes: ReplayOutcome[] = [];
    for (const entry of entries) {
      try {
        let result: VerificationResult;
        if (entry.type === "range") {
          result = this.verifier.verifyRange(entry.proof);
        } else if (entry.type === "event") {
          result = this.verifier.verifyEvent(entry.proof);
        } else {
          result = this.verifier.verifyGap(entry.proof);
        }
        outcomes.push({ entry, result });
      } catch (error) {
        outcomes.push({ entry, error: error as Error });
        break;
      }
    }
    return outcomes;
  }
}

function rangeKey(range: Range): string {
  return `${range.start}:${range.end}`;
}

function validateRange(range: Range): void {
  if (range.end < range.start) {
    throw new Error("invalid range");
  }
}

function ensureCoverage(range: Range, indices: number[]): void {
  if (!indices.length) {
    throw new Error("range proof contained no events");
  }
  const sorted = [...indices].sort((a, b) => a - b);
  if (sorted[0] !== range.start) {
    throw new Error("range proof missing start index");
  }
  if (sorted[sorted.length - 1] !== range.end) {
    throw new Error("range proof missing end index");
  }
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      throw new Error("range proof skipped event indices");
    }
  }
}

function validateHeader(header: BlockHeader): void {
  const expected = deriveBlockDigest(header);
  if (!equalDigests(expected, header.digest)) {
    throw new Error("block header digest mismatch");
  }
}

function deriveBlockDigest(header: BlockHeader): string {
  const hash = createHash("sha256");
  hash.update(Buffer.from("alsp.block"));
  hash.update(writeUint64(header.index));
  hash.update(writeUint64(header.startIndex));
  hash.update(writeUint64(header.endIndex));
  hash.update(decodeDigest(header.merkleRoot));
  hash.update(decodeDigest(header.prevDigest));
  return encodeDigest(hash.digest());
}

function digestEvent(event: Event): Buffer {
  const hash = createHash("sha256");
  hash.update(writeUint64(event.index));
  hash.update(writeUint64(parseTimestamp(event.timestamp)));
  hash.update(Buffer.from(event.payload, "base64"));
  return hash.digest();
}

function verifyMerkleProof(rootDigest: string, proof: MerkleProof): boolean {
  let current = leafHash(decodeDigest(proof.leafDigest));
  for (let i = 0; i < proof.siblingDigests.length; i += 1) {
    const sibling = decodeDigest(proof.siblingDigests[i]);
    if (proof.pathBits[i] === 0) {
      current = nodeHash(current, sibling);
    } else {
      current = nodeHash(sibling, current);
    }
  }
  return equalDigests(encodeDigest(current), rootDigest);
}

function leafHash(leaf: Buffer): Buffer {
  const hash = createHash("sha256");
  hash.update(Buffer.from("leaf"));
  hash.update(leaf);
  return hash.digest();
}

function nodeHash(left: Buffer, right: Buffer): Buffer {
  const hash = createHash("sha256");
  hash.update(Buffer.from("node"));
  hash.update(left);
  hash.update(right);
  return hash.digest();
}

function equalDigests(a: string, b: string): boolean {
  return Buffer.compare(decodeDigest(a), decodeDigest(b)) === 0;
}

function decodeDigest(value: string): Buffer {
  if (!value) {
    return Buffer.alloc(0);
  }
  return Buffer.from(value, "base64");
}

function encodeDigest(value: Buffer): string {
  return value.toString("base64");
}

function writeUint64(value: number | bigint): Buffer {
  let big = BigInt(value);
  const mod = 1n << 64n;
  if (big < 0) {
    big = (big % mod + mod) % mod;
  }
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(big);
  return buffer;
}

function parseTimestamp(timestamp: string): bigint {
  const match = timestamp.match(/^(.*?)(?:\.(\d+))?Z$/);
  if (!match) {
    throw new Error(`invalid timestamp: ${timestamp}`);
  }
  const base = Date.parse(`${match[1]}Z`);
  if (Number.isNaN(base)) {
    throw new Error(`invalid timestamp: ${timestamp}`);
  }
  const fraction = match[2] ? (match[2] + "000000000").slice(0, 9) : "000000000";
  return BigInt(base) * 1_000_000n + BigInt(fraction);
}
