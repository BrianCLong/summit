export type SlsaProvenance = {
  builder: string;
  materials: string[];
  reproducible: true;
  compositeSig: any;
};

export async function attest(bundleHash: string, signer: { sign: (payload: Buffer) => Promise<any> }): Promise<SlsaProvenance> {
  const payload = Buffer.from(JSON.stringify({ bundleHash, time: Date.now() }));
  const compositeSig = await signer.sign(payload);
  return {
    builder: 'publisher-ci',
    materials: [bundleHash],
    reproducible: true,
    compositeSig,
  };
}
