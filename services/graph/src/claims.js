"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimRepo = void 0;
class ClaimRepo {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Create or update a claim and link supporting evidence.
     * @param caseId identifier for the investigation case
     * @param text textual content of the claim
     * @param confidence confidence score for the claim
     * @param sourceEvidenceIds list of evidence node ids supporting the claim
     * @returns the created or updated claim node
     */
    async upsertClaim(caseId, text, confidence, sourceEvidenceIds) {
        const session = this.driver.session();
        try {
            const res = await session.executeWrite((tx) => tx.run(`MERGE (c:Claim {text:$text, caseId:$caseId})
           ON CREATE SET c.id=randomUUID(), c.createdAt=timestamp(), c.confidence=$confidence
           WITH c
           UNWIND $eids as eid
           MATCH (e:Evidence {id:eid})
           MERGE (e)-[:SUPPORTS]->(c)
           RETURN c`, { caseId, text, confidence, eids: sourceEvidenceIds }));
            const node = res.records[0]?.get('c');
            return node ? this.nodeToClaim(node) : undefined;
        }
        finally {
            await session.close();
        }
    }
    async getClaimById(id) {
        const session = this.driver.session();
        try {
            const res = await session.executeRead((tx) => tx.run(`MATCH (c:Claim {id:$id}) RETURN c`, { id }));
            const node = res.records[0]?.get('c');
            return node ? this.nodeToClaim(node) : null;
        }
        finally {
            await session.close();
        }
    }
    async getClaimsForCase(caseId) {
        const session = this.driver.session();
        try {
            const res = await session.executeRead((tx) => tx.run(`MATCH (c:Claim {caseId:$caseId}) RETURN c`, { caseId }));
            return res.records.map((r) => this.nodeToClaim(r.get('c')));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Create a CONTRADICTS relationship between two claims by their ids.
     */
    async linkContradictionById(claimIdA, claimIdB) {
        const session = this.driver.session();
        try {
            await session.executeWrite((tx) => tx.run(`MATCH (a:Claim {id:$a}), (b:Claim {id:$b}) MERGE (a)-[:CONTRADICTS]->(b)`, {
                a: claimIdA,
                b: claimIdB,
            }));
        }
        finally {
            await session.close();
        }
    }
    async unlinkContradictionById(claimIdA, claimIdB) {
        const session = this.driver.session();
        try {
            await session.executeWrite((tx) => tx.run(`MATCH (a:Claim {id:$a})-[r:CONTRADICTS]->(b:Claim {id:$b}) DELETE r`, {
                a: claimIdA,
                b: claimIdB,
            }));
        }
        finally {
            await session.close();
        }
    }
    async findContradictions(claimId) {
        const session = this.driver.session();
        try {
            const res = await session.executeRead((tx) => tx.run(`MATCH (:Claim {id:$id})-[:CONTRADICTS]->(c:Claim) RETURN c`, {
                id: claimId,
            }));
            return res.records.map((r) => this.nodeToClaim(r.get('c')));
        }
        finally {
            await session.close();
        }
    }
    nodeToClaim(node) {
        const props = node.properties;
        return {
            id: props.id,
            caseId: props.caseId,
            text: props.text,
            confidence: props.confidence,
            createdAt: props.createdAt,
        };
    }
}
exports.ClaimRepo = ClaimRepo;
exports.default = ClaimRepo;
