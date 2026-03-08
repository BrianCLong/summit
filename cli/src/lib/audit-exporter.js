"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditExporter = exports.verifySignature = exports.verifyChain = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const hashRecord = (record) => crypto_1.default
    .createHash('sha256')
    .update(JSON.stringify({
    sequence: record.sequence,
    recorded_at: record.recorded_at,
    prev_hash: record.prev_hash,
    payload_hash: record.payload_hash,
}))
    .digest('hex');
const defaultStorePath = () => process.env.AUDIT_EVENT_STORE ?? path_1.default.join(process.cwd(), 'logs', 'audit', 'audit-events.jsonl');
const defaultOutputDir = () => path_1.default.join(process.cwd(), 'audit-exports');
const ensureDir = async (dir) => {
    await fs_1.default.promises.mkdir(dir, { recursive: true });
};
const parseEvents = async (storePath) => {
    if (!fs_1.default.existsSync(storePath))
        return [];
    const contents = await fs_1.default.promises.readFile(storePath, 'utf8');
    return contents
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
};
const redactEvent = (event) => {
    const base = { ...event, actor: { ...event.actor }, resource: { ...event.resource } };
    switch (event.classification) {
        case 'public':
            return base;
        case 'internal':
            delete base.actor.ip_address;
            return base;
        case 'confidential':
            delete base.actor.ip_address;
            delete base.actor.id;
            delete base.resource.id;
            delete base.resource.owner;
            return base;
        case 'restricted':
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
const verifyChain = (records, expectedStart = 'GENESIS') => {
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
exports.verifyChain = verifyChain;
const signManifest = (data, signingKey) => {
    const privateKey = signingKey ?? crypto_1.default.generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const sign = crypto_1.default.sign(null, Buffer.from(JSON.stringify(data)), privateKey);
    const publicKey = crypto_1.default.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString();
    return { signature: sign.toString('base64'), publicKey };
};
const verifySignature = (manifest, publicKey) => {
    const { signature, public_key: manifestPublicKey, ...rest } = manifest;
    if (!signature)
        return false;
    const key = publicKey ?? manifestPublicKey;
    // The original data was signed with public_key: '' so we need to match that
    const unsigned = { ...rest, public_key: '' };
    return crypto_1.default.verify(null, Buffer.from(JSON.stringify(unsigned)), key, Buffer.from(signature, 'base64'));
};
exports.verifySignature = verifySignature;
class AuditExporter {
    async export(options) {
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
        const chainStart = filtered[0]?.prev_hash ?? 'GENESIS';
        const chainValid = (0, exports.verifyChain)(filtered, chainStart);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const directory = path_1.default.join(outputDir, `audit-export-${options.customer}-${timestamp}`);
        await ensureDir(directory);
        const eventsFile = path_1.default.join(directory, 'events.jsonl');
        const manifestFile = path_1.default.join(directory, 'manifest.json');
        const unsignedManifest = {
            version: 'audit-export-v1',
            customer: options.customer,
            from: options.from,
            to: options.to,
            exported_at: new Date().toISOString(),
            events_file: 'events.jsonl',
            event_count: redacted.length,
            hash_chain: {
                start: chainStart,
                end: filtered[filtered.length - 1]?.hash,
                valid: chainValid,
            },
            redaction_rules: [
                'internal: drop actor.ip_address',
                'confidential: drop actor identifiers and owner metadata',
                'restricted: keep only types and decision identifiers; metadata flagged as redacted',
            ],
            public_key: '',
        };
        const signingKey = options.signingKeyPath
            ? await fs_1.default.promises.readFile(options.signingKeyPath, 'utf8')
            : undefined;
        const { signature, publicKey } = signManifest(unsignedManifest, signingKey);
        const manifest = { ...unsignedManifest, signature, public_key: publicKey };
        await fs_1.default.promises.writeFile(eventsFile, redacted.map((record) => JSON.stringify(record)).join('\n') + '\n', 'utf8');
        await fs_1.default.promises.writeFile(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
        await fs_1.default.promises.writeFile(path_1.default.join(directory, 'manifest.sig'), manifest.signature ?? '', 'utf8');
        if (options.signingKeyPath) {
            const publicPath = path_1.default.join(directory, 'public.pem');
            await fs_1.default.promises.writeFile(publicPath, publicKey, 'utf8');
        }
        return { manifest, directory };
    }
}
exports.AuditExporter = AuditExporter;
