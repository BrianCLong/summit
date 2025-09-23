function allowRun(input: any) {
  return (
    input.isExternalPublisher === true &&
    input.zkBundle.ok === true &&
    input.zkBundle.kMin >= 25 &&
    input.zkBundle.epsCap_ok === true &&
    input.noRowExport === true
  );
}

describe('zkdp policy gate', () => {
  it('allows valid input', () => {
    expect(
      allowRun({
        isExternalPublisher: true,
        zkBundle: { ok: true, kMin: 25, epsCap_ok: true },
        noRowExport: true,
      })
    ).toBe(true);
  });

  it('denies when proofs missing', () => {
    expect(
      allowRun({
        isExternalPublisher: true,
        zkBundle: { ok: false, kMin: 10, epsCap_ok: false },
        noRowExport: false,
      })
    ).toBe(false);
  });
});
