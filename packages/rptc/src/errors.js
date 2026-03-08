"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptValidationError = exports.SlotValidationError = void 0;
class SlotValidationError extends Error {
    slot;
    details;
    constructor(slot, details) {
        const message = details
            .map((detail) => `${detail.code}: ${detail.message}`)
            .join('; ');
        super(`Slot "${slot}" validation failed: ${message}`);
        this.name = 'SlotValidationError';
        this.slot = slot;
        this.details = details;
    }
}
exports.SlotValidationError = SlotValidationError;
class PromptValidationError extends Error {
    templateName;
    slotErrors;
    constructor(templateName, slotErrors) {
        const segments = Object.entries(slotErrors).map(([slot, errors]) => {
            const joined = errors
                .map((error) => `${error.code}: ${error.message}`)
                .join('; ');
            return `${slot} -> ${joined}`;
        });
        super(`Prompt template "${templateName}" validation failed: ${segments.join(' | ')}`);
        this.name = 'PromptValidationError';
        this.templateName = templateName;
        this.slotErrors = slotErrors;
    }
}
exports.PromptValidationError = PromptValidationError;
