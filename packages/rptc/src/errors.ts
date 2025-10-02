export interface SlotErrorDetail {
  readonly code: string;
  readonly message: string;
  readonly meta?: Record<string, unknown>;
}

export class SlotValidationError extends Error {
  public readonly slot: string;
  public readonly details: SlotErrorDetail[];

  constructor(slot: string, details: SlotErrorDetail[]) {
    const message = details.map((detail) => `${detail.code}: ${detail.message}`).join('; ');
    super(`Slot \"${slot}\" validation failed: ${message}`);
    this.name = 'SlotValidationError';
    this.slot = slot;
    this.details = details;
  }
}

export class PromptValidationError extends Error {
  public readonly templateName: string;
  public readonly slotErrors: Record<string, SlotErrorDetail[]>;

  constructor(templateName: string, slotErrors: Record<string, SlotErrorDetail[]>) {
    const segments = Object.entries(slotErrors).map(([slot, errors]) => {
      const joined = errors.map((error) => `${error.code}: ${error.message}`).join('; ');
      return `${slot} -> ${joined}`;
    });
    super(`Prompt template \"${templateName}\" validation failed: ${segments.join(' | ')}`);
    this.name = 'PromptValidationError';
    this.templateName = templateName;
    this.slotErrors = slotErrors;
  }
}
