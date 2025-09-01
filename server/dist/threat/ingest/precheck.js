export const ALLOW_TYPES = ['image/png', 'image/jpeg', 'audio/mpeg'];
export const MAX_SIZE = 10 * 1024 * 1024; // 10MB
export function perceptualHash(_buf) {
    // TODO: replace with real pHash implementation
    return 'phash-stub';
}
export function mfccFingerprint(_buf) {
    // TODO: replace with real MFCC fingerprinting
    return 'mfcc-stub';
}
export function precheck(file) {
    const flags = [];
    if (!ALLOW_TYPES.includes(file.mimetype)) {
        flags.push('disallowed-type');
    }
    if (file.size > MAX_SIZE) {
        flags.push('file-too-large');
    }
    return {
        allowed: flags.length === 0,
        flags,
        pHash: perceptualHash(file.buffer),
        mfcc: mfccFingerprint(file.buffer)
    };
}
//# sourceMappingURL=precheck.js.map