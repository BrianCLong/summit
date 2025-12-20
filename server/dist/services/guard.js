const INJECTION_SIGNS = [
    /ignore previous/i,
    /disregard instructions/i,
    /exfiltrate/i,
    /system prompt/i,
    /retrieve secrets?/i,
    /api key/i,
];
export function isSuspicious(input) {
    const s = input.slice(0, 4000);
    return INJECTION_SIGNS.some((rx) => rx.test(s));
}
//# sourceMappingURL=guard.js.map