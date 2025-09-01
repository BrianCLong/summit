export function requireCapability(token, list) {
    if (!list.includes(token)) {
        throw new Error('capability denied');
    }
}
//# sourceMappingURL=Capabilities.js.map