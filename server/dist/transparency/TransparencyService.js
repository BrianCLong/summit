import { MerkleLog } from "./MerkleLog";
export class TransparencyService {
    constructor() {
        this.log = new MerkleLog();
        this.index = {};
    }
    append(entry) {
        const res = this.log.append(entry);
        this.index[entry.entitlementId] = this.logSize() - 1;
        return res;
    }
    proof(entitlementId) {
        const idx = this.index[entitlementId];
        if (idx === undefined)
            throw new Error("entitlement-not-found");
        const proof = this.log.proof(idx);
        return { entitlementId, leaf: proof.path[0] || "", root: proof.root, path: proof.path, sth: proof.root };
    }
    logSize() {
        return Object.keys(this.index).length;
    }
}
//# sourceMappingURL=TransparencyService.js.map