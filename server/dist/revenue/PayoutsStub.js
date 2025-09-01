export function calcShare(s) {
    const net = Math.floor((s.grossCents * (s.sharePct / 100)));
    return { ...s, netCents: net };
}
//# sourceMappingURL=PayoutsStub.js.map