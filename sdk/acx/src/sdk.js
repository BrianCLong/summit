"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveConsentSDK = void 0;
const artifact_js_1 = require("./artifact.js");
const templatePack_js_1 = require("./templatePack.js");
class AdaptiveConsentSDK {
    pack;
    templatePack;
    constructor(pack) {
        this.pack = pack;
        this.templatePack = new templatePack_js_1.TemplatePack(pack);
    }
    registerExperiment(definition) {
        this.templatePack.registerExperiment(definition);
    }
    render(options) {
        return this.templatePack.render(options);
    }
    createConsentRecord(userId, decision, options) {
        return this.templatePack.createConsentRecord(userId, decision, options).record;
    }
    emitSignedArtifact(userId, decision, options, privateKeyPem) {
        const record = this.createConsentRecord(userId, decision, options);
        const signer = new artifact_js_1.ConsentArtifactSigner(privateKeyPem);
        return signer.sign(record);
    }
    static verifyArtifact(artifact, publicKeyPem) {
        return artifact_js_1.ConsentArtifactSigner.verify(artifact, publicKeyPem);
    }
}
exports.AdaptiveConsentSDK = AdaptiveConsentSDK;
