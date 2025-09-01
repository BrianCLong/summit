export async function attest(bundleHash, signer) {
    const payload = Buffer.from(JSON.stringify({ bundleHash, time: Date.now() }));
    const compositeSig = await signer.sign(payload);
    return {
        builder: 'publisher-ci',
        materials: [bundleHash],
        reproducible: true,
        compositeSig,
    };
}
//# sourceMappingURL=Provenance.js.map