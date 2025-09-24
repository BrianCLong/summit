import { createHash, randomUUID } from 'node:crypto';
function normaliseTimestamp(value) {
    if (value) {
        return new Date(value).toISOString();
    }
    return new Date().toISOString();
}
function computeHash(entry) {
    const hash = createHash('sha256');
    hash.update(entry.id);
    hash.update(entry.category);
    hash.update(entry.actor);
    hash.update(entry.action);
    hash.update(entry.resource);
    hash.update(JSON.stringify(entry.payload));
    hash.update(entry.timestamp);
    if (entry.previousHash) {
        hash.update(entry.previousHash);
    }
    return hash.digest('hex');
}
function computeDigest(value) {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(value));
    return hash.digest('hex');
}
function createSignature(tenant, digest) {
    return `stub-signature:${tenant}:${digest.slice(0, 12)}`;
}
function freezeDeep(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const key of Object.keys(value)) {
            const nested = value[key];
            if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
                freezeDeep(nested);
            }
        }
    }
    return value;
}
function clonePlain(value) {
    return JSON.parse(JSON.stringify(value));
}
function normaliseMetadata(metadata) {
    const tags = Array.from(metadata.policyTags ?? []);
    const savings = Number.isFinite(metadata.savingsUSD ?? NaN)
        ? Number(metadata.savingsUSD)
        : 0;
    const base = {
        policyTags: Object.freeze(tags),
        savingsUSD: savings
    };
    if (metadata.notes) {
        return { ...base, notes: metadata.notes };
    }
    return base;
}
function isValidSha256(candidate) {
    return /^[a-f0-9]{64}$/i.test(candidate);
}
function computeMerkleRoot(artifacts) {
    if (!artifacts || artifacts.length === 0) {
        return '';
    }
    let level = artifacts
        .map(artifact => Buffer.from(artifact.sha256, 'hex'))
        .sort((left, right) => Buffer.compare(left, right));
    while (level.length > 1) {
        const nextLevel = [];
        for (let index = 0; index < level.length; index += 2) {
            const left = level[index];
            const right = level[index + 1] ?? left;
            const hash = createHash('sha256');
            hash.update(left);
            hash.update(right);
            nextLevel.push(hash.digest());
        }
        level = nextLevel;
    }
    return level[0]?.toString('hex') ?? '';
}
function toEvidencePayload(input) {
    const base = {
        tenant: input.tenant,
        caseId: input.caseId,
        environment: input.environment,
        operation: input.operation,
        request: input.request,
        policy: input.policy,
        decision: input.decision,
        model: input.model,
        cost: input.cost,
        output: input.output
    };
    const createdAt = 'createdAt' in input && input.createdAt
        ? normaliseTimestamp(input.createdAt)
        : normaliseTimestamp();
    const digest = 'digest' in input && typeof input.digest === 'string' && input.digest.length === 64
        ? input.digest
        : computeDigest(base);
    return {
        ...base,
        createdAt,
        digest
    };
}
export function buildEvidencePayload(input) {
    return toEvidencePayload(input);
}
export class InMemoryLedger {
    entries = [];
    record(payload) {
        const canonical = toEvidencePayload(payload);
        const id = `evidence:${canonical.caseId}:${(this.entries.length + 1).toString(36)}:${Date.now().toString(36)}`;
        const signature = createSignature(canonical.tenant, canonical.digest);
        const record = freezeDeep({
            ...canonical,
            id,
            signature
        });
        this.entries.push(record);
        return record;
    }
    get(id) {
        return this.entries.find(entry => entry.id === id);
    }
    list(limit) {
        const data = [...this.entries];
        if (limit && limit > 0) {
            return data.slice(-limit).reverse();
        }
        return data.reverse();
    }
}
export class ProvenanceLedger {
    namespace;
    entries = [];
    decisions = [];
    constructor(options = {}) {
        this.namespace = options.namespace ?? 'default';
    }
    append(fact) {
        const timestamp = normaliseTimestamp(fact.timestamp);
        const previousHash = this.entries.at(-1)?.hash;
        const entry = {
            ...fact,
            timestamp,
            previousHash,
            hash: ''
        };
        entry.hash = computeHash(entry);
        this.entries.push(entry);
        return entry;
    }
    record(decision, metadata = {}) {
        const createdAt = normaliseTimestamp();
        const digest = computeDigest(decision);
        const decisionCopy = freezeDeep(clonePlain(decision));
        const metadataCopy = freezeDeep(normaliseMetadata(metadata));
        const id = `${this.namespace}:${decision.taskId}:${(this.decisions.length + 1).toString(36)}:${Date.now().toString(36)}`;
        const entry = freezeDeep({
            id,
            namespace: this.namespace,
            createdAt,
            digest,
            decision: decisionCopy,
            metadata: metadataCopy
        });
        this.decisions.push(entry);
        return entry;
    }
    list(filter) {
        let data = [...this.entries];
        if (filter?.category) {
            data = data.filter(entry => entry.category === filter.category);
        }
        if (filter?.limit && filter.limit > 0) {
            data = data.slice(-filter.limit);
        }
        return data;
    }
    findByTask(taskId) {
        return this.decisions.filter(entry => entry.decision.taskId === taskId);
    }
    summary() {
        const totalBudgetDeltaUSD = this.decisions.reduce((sum, entry) => sum + Number(entry.decision.budgetDeltaUSD ?? 0), 0);
        const totalSavingsUSD = this.decisions.reduce((sum, entry) => sum + entry.metadata.savingsUSD, 0);
        return {
            namespace: this.namespace,
            count: this.decisions.length,
            totalBudgetDeltaUSD,
            totalSavingsUSD,
            lastRecordedAt: this.decisions.at(-1)?.createdAt ?? null
        };
    }
    verify(entry) {
        if (entry) {
            const digest = computeDigest(entry.decision);
            if (digest !== entry.digest || entry.namespace !== this.namespace) {
                return false;
            }
            return this.decisions.some(candidate => candidate.id === entry.id && candidate.digest === entry.digest);
        }
        return this.entries.every((item, index) => {
            const expectedPrevious = index === 0 ? undefined : this.entries[index - 1].hash;
            if (expectedPrevious !== item.previousHash) {
                return false;
            }
            const recalculated = computeHash({ ...item });
            return recalculated === item.hash;
        });
    }
    createManifest(options) {
        if (!options.artifacts || options.artifacts.length === 0) {
            throw new Error('At least one artifact is required to build a manifest.');
        }
        for (const artifact of options.artifacts) {
            if (!isValidSha256(artifact.sha256)) {
                throw new Error(`Artifact ${artifact.path} has an invalid sha256 digest.`);
            }
        }
        const manifest = {
            version: '0.1',
            createdAt: new Date().toISOString(),
            exportId: options.exportId ?? randomUUID(),
            artifacts: options.artifacts,
            transforms: options.transforms ?? [],
            provenance: options.provenance,
            policy: options.policy,
            signatures: options.signatures ?? [],
            merkleRoot: computeMerkleRoot(options.artifacts)
        };
        const unverifiable = options.unverifiable ?? (manifest.signatures.length === 0 ? ['missing-signatures'] : []);
        if (unverifiable.length > 0) {
            manifest.unverifiable = [...new Set(unverifiable)];
        }
        return manifest;
    }
    verifyManifest(manifest) {
        const schemaIssues = [];
        const tamperIssues = [];
        const warnings = [];
        if (!manifest.version) {
            schemaIssues.push('manifest.version is required');
        }
        if (!manifest.exportId) {
            schemaIssues.push('manifest.exportId is required');
        }
        if (!manifest.createdAt) {
            schemaIssues.push('manifest.createdAt is required');
        }
        if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
            schemaIssues.push('manifest.artifacts must contain at least one artifact');
        }
        const artifactHashes = new Set();
        if (Array.isArray(manifest.artifacts)) {
            for (const artifact of manifest.artifacts) {
                if (!isValidSha256(artifact.sha256)) {
                    schemaIssues.push(`artifact ${artifact.path} has invalid sha256`);
                }
                else if (artifactHashes.has(artifact.sha256)) {
                    schemaIssues.push(`duplicate artifact digest detected for ${artifact.path}`);
                }
                artifactHashes.add(artifact.sha256);
            }
        }
        let merkleRoot = '';
        try {
            merkleRoot = computeMerkleRoot(manifest.artifacts ?? []);
        }
        catch (error) {
            schemaIssues.push(`failed to compute merkle root: ${error.message}`);
        }
        if (manifest.merkleRoot !== merkleRoot) {
            tamperIssues.push('manifest merkleRoot does not match recomputed value');
        }
        if (Array.isArray(manifest.transforms)) {
            for (const transform of manifest.transforms) {
                if (!isValidSha256(transform.outputSha256)) {
                    schemaIssues.push(`transform ${transform.op} has invalid outputSha256`);
                }
                else if (!artifactHashes.has(transform.outputSha256)) {
                    tamperIssues.push(`transform ${transform.op} references unknown artifact digest`);
                }
            }
        }
        if (!Array.isArray(manifest.signatures) || manifest.signatures.length === 0) {
            warnings.push('no signatures present in manifest');
        }
        if (Array.isArray(manifest.unverifiable)) {
            warnings.push(...manifest.unverifiable);
        }
        if (schemaIssues.length > 0) {
            return { status: 'schema-mismatch', issues: [...schemaIssues, ...tamperIssues, ...warnings], manifest };
        }
        if (tamperIssues.length > 0) {
            return { status: 'tampered', issues: [...tamperIssues, ...warnings], manifest };
        }
        if (warnings.length > 0) {
            return { status: 'unverifiable', issues: warnings, manifest };
        }
        return { status: 'pass', issues: [], manifest };
    }
    exportEvidence(filter, manifestOptions) {
        const entries = this.list(filter);
        const manifest = manifestOptions ? this.createManifest(manifestOptions) : undefined;
        return {
            generatedAt: new Date().toISOString(),
            headHash: entries.at(-1)?.hash,
            entries,
            manifest,
            warnings: manifest?.unverifiable
        };
    }
}
