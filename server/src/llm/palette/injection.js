"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPaletteInjection = applyPaletteInjection;
exports.sanitizeMessagesForRedaction = sanitizeMessagesForRedaction;
exports.paletteAsPromptContent = paletteAsPromptContent;
function applyPaletteInjection(palette, messages) {
    const injection = palette.injection;
    if (injection.kind === 'text_prefix') {
        const prefix = injection.textPrefix ?? '';
        const systemIndex = messages.findIndex((m) => m.role === 'system');
        if (systemIndex >= 0) {
            const existing = messages[systemIndex];
            const merged = { ...existing, content: `${existing.content}\n\n${prefix}` };
            const updated = [...messages];
            updated[systemIndex] = merged;
            return { messages: updated, injectionKind: 'text_prefix' };
        }
        return {
            messages: [{ role: 'system', content: prefix }, ...messages],
            injectionKind: 'text_prefix',
        };
    }
    // soft prefix: for providers that support it, we leave messages unchanged and rely on adapter
    return { messages, injectionKind: 'soft_prefix' };
}
function sanitizeMessagesForRedaction(messages) {
    return messages.map((msg) => ({ ...msg }));
}
function paletteAsPromptContent(injection) {
    if (injection.kind === 'text_prefix')
        return injection.textPrefix;
    return undefined;
}
