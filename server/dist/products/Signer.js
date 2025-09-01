export class KmsSigner {
    constructor(keyId, client) {
        this.keyId = keyId;
        this.client = client;
    }
    sign(p) {
        return this.client.sign(this.keyId, p);
    }
    verify(p, s) {
        return this.client.verify(this.keyId, p, s);
    }
    kid() {
        return this.keyId;
    }
}
//# sourceMappingURL=Signer.js.map