"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplaySession = exports.AlspClient = exports.AlspVerifier = exports.MemoryTransport = exports.HttpTransport = void 0;
const crypto_1 = require("crypto");
class HttpTransport {
    baseUrl;
    fetchImpl;
    constructor(baseUrl, fetchImpl) {
        this.baseUrl = baseUrl;
        this.fetchImpl = fetchImpl ?? globalThis.fetch;
        if (!this.fetchImpl) {
            throw new Error("fetch implementation is required in this environment");
        }
    }
    async proveRange(range) {
        return this.post("/proveRange", range);
    }
    async proveEvent(index) {
        return this.post("/proveEvent", { index });
    }
    async proveGap(start, end) {
        return this.post("/proveGap", { start, end });
    }
    async post(path, body) {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`ALSP transport error: ${response.status}`);
        }
        return (await response.json());
    }
}
exports.HttpTransport = HttpTransport;
class MemoryTransport {
    rangeProofs = new Map();
    eventProofs = new Map();
    gapProofs = new Map();
    setRangeProof(range, proof) {
        this.rangeProofs.set(rangeKey(range), proof);
    }
    setEventProof(index, proof) {
        this.eventProofs.set(index, proof);
    }
    setGapProof(start, end, proof) {
        this.gapProofs.set(rangeKey({ start, end }), proof);
    }
    async proveRange(range) {
        const proof = this.rangeProofs.get(rangeKey(range));
        if (!proof) {
            throw new Error("no cached range proof available");
        }
        return proof;
    }
    async proveEvent(index) {
        const proof = this.eventProofs.get(index);
        if (!proof) {
            throw new Error("no cached event proof available");
        }
        return proof;
    }
    async proveGap(start, end) {
        const proof = this.gapProofs.get(rangeKey({ start, end }));
        if (!proof) {
            throw new Error("no cached gap proof available");
        }
        return proof;
    }
}
exports.MemoryTransport = MemoryTransport;
class AlspVerifier {
    anchor;
    constructor(anchor) {
        this.anchor = anchor;
    }
    verifyRange(proof) {
        validateRange(proof.query);
        if (!proof.blocks.length) {
            throw new Error("range proof missing blocks");
        }
        this.ensureAnchor(proof.headDigest);
        if (!equalDigests(proof.startAnchor, proof.blocks[0].header.prevDigest)) {
            throw new Error("range start anchor mismatch");
        }
        const covered = [];
        let previousHeader;
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
    verifyEvent(proof) {
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
    verifyGap(proof) {
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
    validateBlock(block, previous) {
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
    ensureAnchor(digest) {
        if (!this.anchor) {
            this.anchor = digest;
            return;
        }
        if (!equalDigests(this.anchor, digest)) {
            throw new Error("head digest mismatch");
        }
    }
}
exports.AlspVerifier = AlspVerifier;
class AlspClient {
    transport;
    verifier;
    constructor(transport, verifier) {
        this.transport = transport;
        this.verifier = verifier;
    }
    async proveRange(range) {
        const proof = await this.transport.proveRange(range);
        const verification = this.verifier.verifyRange(proof);
        return { proof, verification };
    }
    async proveEvent(index) {
        const proof = await this.transport.proveEvent(index);
        const verification = this.verifier.verifyEvent(proof);
        return { proof, verification };
    }
    async proveGap(start, end) {
        const proof = await this.transport.proveGap(start, end);
        const verification = this.verifier.verifyGap(proof);
        return { proof, verification };
    }
}
exports.AlspClient = AlspClient;
class ReplaySession {
    verifier;
    constructor(verifier) {
        this.verifier = verifier;
    }
    replay(entries) {
        const outcomes = [];
        for (const entry of entries) {
            try {
                let result;
                if (entry.type === "range") {
                    result = this.verifier.verifyRange(entry.proof);
                }
                else if (entry.type === "event") {
                    result = this.verifier.verifyEvent(entry.proof);
                }
                else {
                    result = this.verifier.verifyGap(entry.proof);
                }
                outcomes.push({ entry, result });
            }
            catch (error) {
                outcomes.push({ entry, error: error });
                break;
            }
        }
        return outcomes;
    }
}
exports.ReplaySession = ReplaySession;
function rangeKey(range) {
    return `${range.start}:${range.end}`;
}
function validateRange(range) {
    if (range.end < range.start) {
        throw new Error("invalid range");
    }
}
function ensureCoverage(range, indices) {
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
function validateHeader(header) {
    const expected = deriveBlockDigest(header);
    if (!equalDigests(expected, header.digest)) {
        throw new Error("block header digest mismatch");
    }
}
function deriveBlockDigest(header) {
    const hash = (0, crypto_1.createHash)("sha256");
    hash.update(Buffer.from("alsp.block"));
    hash.update(writeUint64(header.index));
    hash.update(writeUint64(header.startIndex));
    hash.update(writeUint64(header.endIndex));
    hash.update(decodeDigest(header.merkleRoot));
    hash.update(decodeDigest(header.prevDigest));
    return encodeDigest(hash.digest());
}
function digestEvent(event) {
    const hash = (0, crypto_1.createHash)("sha256");
    hash.update(writeUint64(event.index));
    hash.update(writeUint64(parseTimestamp(event.timestamp)));
    hash.update(Buffer.from(event.payload, "base64"));
    return hash.digest();
}
function verifyMerkleProof(rootDigest, proof) {
    let current = leafHash(decodeDigest(proof.leafDigest));
    for (let i = 0; i < proof.siblingDigests.length; i += 1) {
        const sibling = decodeDigest(proof.siblingDigests[i]);
        if (proof.pathBits[i] === 0) {
            current = nodeHash(current, sibling);
        }
        else {
            current = nodeHash(sibling, current);
        }
    }
    return equalDigests(encodeDigest(current), rootDigest);
}
function leafHash(leaf) {
    const hash = (0, crypto_1.createHash)("sha256");
    hash.update(Buffer.from("leaf"));
    hash.update(leaf);
    return hash.digest();
}
function nodeHash(left, right) {
    const hash = (0, crypto_1.createHash)("sha256");
    hash.update(Buffer.from("node"));
    hash.update(left);
    hash.update(right);
    return hash.digest();
}
function equalDigests(a, b) {
    return Buffer.compare(decodeDigest(a), decodeDigest(b)) === 0;
}
function decodeDigest(value) {
    if (!value) {
        return Buffer.alloc(0);
    }
    return Buffer.from(value, "base64");
}
function encodeDigest(value) {
    return value.toString("base64");
}
function writeUint64(value) {
    let big = BigInt(value);
    const mod = 1n << 64n;
    if (big < 0) {
        big = (big % mod + mod) % mod;
    }
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(big);
    return buffer;
}
function parseTimestamp(timestamp) {
    const match = timestamp.match(/^(.*?)(?:\.(\d+))?Z$/);
    if (!match) {
        throw new Error(`invalid timestamp: ${timestamp}`);
    }
    const base = Date.parse(`${match[1]}Z`);
    if (Number.isNaN(base)) {
        throw new Error(`invalid timestamp: ${timestamp}`);
    }
    const fraction = match[2] ? (match[2] + "000000000").slice(0, 9) : "000000000";
    return BigInt(base) * 1000000n + BigInt(fraction);
}
