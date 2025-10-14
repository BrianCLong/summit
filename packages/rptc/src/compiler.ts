import { PromptValidationError, type SlotErrorDetail } from './errors.js';
import {
  type EnumSlotSchema,
  type NumberSlotSchema,
  type SlotSchema,
  type SlotSchemaMap,
  type SlotValidationOutcome,
  type SlotValues,
  type PartialSlotValues,
  type SlotValue,
  type StringSlotSchema,
  type BooleanSlotSchema
} from './schema.js';
import type { GeneratedTestSuite, TestGenerationOptions } from './testing/types.js';
import { generateTestSuite } from './testing/test-generator.js';
import type { LLMAdapter } from './adapters/types.js';

const PLACEHOLDER_REGEX = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

type PlaceholderNames<S extends string> = S extends `${string}{{${infer Slot}}}${infer Rest}`
  ? TrimPlaceholder<Slot> | PlaceholderNames<Rest>
  : never;

type TrimPlaceholder<S extends string> = S extends ` ${infer R}`
  ? TrimPlaceholder<R>
  : S extends `${infer R} `
    ? TrimPlaceholder<R>
    : S;

type MissingSlots<TTemplate extends string, TSlots extends SlotSchemaMap> = Exclude<PlaceholderNames<TTemplate>, keyof TSlots>;

type UnusedSlots<TTemplate extends string, TSlots extends SlotSchemaMap> = Exclude<keyof TSlots, PlaceholderNames<TTemplate>>;

type ValidateTemplate<TTemplate extends string, TSlots extends SlotSchemaMap> = MissingSlots<TTemplate, TSlots> extends never
  ? UnusedSlots<TTemplate, TSlots> extends never
    ? TSlots
    : never
  : never;

export interface PromptValidationResult<TSlots extends SlotSchemaMap> {
  readonly valid: boolean;
  readonly slots: { [K in keyof TSlots]: SlotValidationOutcome<SlotValue<TSlots[K]>> };
  readonly errors: Array<{ slot: keyof TSlots; details: SlotErrorDetail[] }>;
  readonly value?: SlotValues<TSlots>;
}

export interface CompiledPrompt<TSlots extends SlotSchemaMap> {
  readonly name: string;
  readonly description?: string;
  readonly template: string;
  readonly rendered: string;
  readonly slots: TSlots;
  readonly values: SlotValues<TSlots>;
  readonly metadata?: Record<string, unknown>;
}

export interface PromptTemplateConfig<TTemplate extends string, TSlots extends SlotSchemaMap> {
  readonly name: string;
  readonly template: TTemplate;
  readonly slots: TSlots;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface PromptTemplate<TSlots extends SlotSchemaMap> {
  readonly name: string;
  readonly description?: string;
  readonly template: string;
  readonly slots: TSlots;
  readonly metadata?: Record<string, unknown>;
  validate(values: PartialSlotValues<TSlots>): PromptValidationResult<TSlots>;
  compile(values: SlotValues<TSlots>): CompiledPrompt<TSlots>;
  render(values: SlotValues<TSlots>): string;
  formatFor<TAdapter extends LLMAdapter>(adapter: TAdapter, values: SlotValues<TSlots>, options?: Record<string, unknown>): ReturnType<TAdapter['format']>;
  generateTestSuite(options?: TestGenerationOptions<TSlots>): GeneratedTestSuite<TSlots>;
}

interface InternalValidation<TSlots extends SlotSchemaMap> extends PromptValidationResult<TSlots> {
  readonly value: SlotValues<TSlots>;
}

export function createPromptTemplate<TTemplate extends string, TSlots extends SlotSchemaMap>(
  config: PromptTemplateConfig<TTemplate, ValidateTemplate<TTemplate, TSlots>>
): PromptTemplate<ValidateTemplate<TTemplate, TSlots>> {
  const validatedSlots = config.slots as ValidateTemplate<TTemplate, TSlots>;
  const placeholders = collectPlaceholders(config.template);

  if (placeholders.size === 0) {
    throw new Error(`Prompt template \"${config.name}\" must contain at least one slot placeholder.`);
  }

  const template: PromptTemplate<ValidateTemplate<TTemplate, TSlots>> = {
    name: config.name,
    description: config.description,
    template: config.template,
    slots: validatedSlots,
    metadata: config.metadata,
    validate(values) {
      return validateValues(config.name, validatedSlots, placeholders, values);
    },
    compile(values) {
      const validation = validateValues(config.name, validatedSlots, placeholders, values);
      if (!validation.valid || !validation.value) {
        const errorMap: Record<string, SlotErrorDetail[]> = {};
        for (const item of validation.errors) {
          errorMap[item.slot as string] = item.details;
        }
        throw new PromptValidationError(config.name, errorMap);
      }
      const rendered = renderTemplate(config.template, validation.value);
      return {
        name: config.name,
        description: config.description,
        template: config.template,
        rendered,
        slots: validatedSlots,
        values: validation.value,
        metadata: config.metadata
      } satisfies CompiledPrompt<ValidateTemplate<TTemplate, TSlots>>;
    },
    render(values) {
      return this.compile(values).rendered;
    },
    formatFor(adapter, values, options) {
      const compiled = this.compile(values);
      return adapter.format(compiled, options ?? {});
    },
    generateTestSuite(options) {
      return generateTestSuite(this, options);
    }
  };

  return template;
}

function collectPlaceholders(template: string): Set<string> {
  const matches = template.matchAll(PLACEHOLDER_REGEX);
  const set = new Set<string>();
  for (const match of matches) {
    const placeholder = match[1];
    if (!placeholder) {
      continue;
    }
    set.add(placeholder.trim());
  }
  return set;
}

function validateValues<TSlots extends SlotSchemaMap>(
  templateName: string,
  slots: TSlots,
  placeholders: Set<string>,
  values: PartialSlotValues<TSlots>
): PromptValidationResult<TSlots> | InternalValidation<TSlots> {
  const slotNames = Object.keys(slots) as Array<keyof TSlots>;
  const resolved: Partial<SlotValues<TSlots>> = {};
  const slotOutcomes = {} as { [K in keyof TSlots]: SlotValidationOutcome<SlotValue<TSlots[K]>> };
  const errors: Array<{ slot: keyof TSlots; details: SlotErrorDetail[] }> = [];

  for (const slotName of slotNames) {
    const schema = slots[slotName] as SlotSchema;
    const value = (values as Record<string, unknown>)[slotName as string];
    const outcome = validateSlot(slotName as string, schema, value);
    slotOutcomes[slotName] = outcome as SlotValidationOutcome<SlotValue<TSlots[typeof slotName]>>;
    if (outcome.valid) {
      resolved[slotName] = outcome.value as SlotValues<TSlots>[typeof slotName];
    } else {
      errors.push({ slot: slotName, details: outcome.errors });
    }
  }

  for (const placeholder of placeholders) {
    if (!(placeholder in slots)) {
      errors.push({
        slot: placeholder as keyof TSlots,
        details: [{ code: 'slot.undefined', message: `Placeholder \"${placeholder}\" is not defined in slot schema.` }]
      });
    }
  }

  const extraneous = Object.keys(values ?? {}).filter((key) => !(key in slots));
  for (const key of extraneous) {
    errors.push({
      slot: key as keyof TSlots,
      details: [{ code: 'slot.unexpected', message: `Value provided for undefined slot \"${key}\".` }]
    });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      slots: slotOutcomes,
      errors
    } satisfies PromptValidationResult<TSlots>;
  }

  return {
    valid: true,
    slots: slotOutcomes,
    errors,
    value: resolved as SlotValues<TSlots>
  } satisfies InternalValidation<TSlots>;
}

function validateSlot(slotName: string, schema: SlotSchema, value: unknown): SlotValidationOutcome<unknown> {
  switch (schema.kind) {
    case 'string':
      return validateStringSlot(slotName, schema, value);
    case 'number':
      return validateNumberSlot(slotName, schema, value);
    case 'boolean':
      return validateBooleanSlot(slotName, schema, value);
    case 'enum':
      return validateEnumSlot(slotName, schema as EnumSlotSchema<string>, value);
    default:
      return {
        valid: false,
        errors: [{ code: 'slot.unsupported', message: `Slot \"${slotName}\" has unsupported kind ${(schema as SlotSchema).kind}.` }]
      };
  }
}

function validateStringSlot(slotName: string, schema: StringSlotSchema, value: unknown): SlotValidationOutcome<string> {
  if (value === undefined || value === null) {
    if (schema.defaultValue !== undefined) {
      return { valid: true, value: schema.defaultValue };
    }
    if (schema.optional) {
      return { valid: true, value: '' };
    }
    return { valid: false, errors: [{ code: 'slot.required', message: `Slot \"${slotName}\" is required.` }] };
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      errors: [{ code: 'slot.type', message: `Slot \"${slotName}\" must be a string.` }]
    };
  }

  const constraints = schema.constraints;
  const violations: SlotErrorDetail[] = [];

  if (constraints?.minLength !== undefined && value.length < constraints.minLength) {
    violations.push({
      code: 'string.minLength',
      message: `Length must be >= ${constraints.minLength}.`,
      meta: { provided: value.length }
    });
  }

  if (constraints?.maxLength !== undefined && value.length > constraints.maxLength) {
    violations.push({
      code: 'string.maxLength',
      message: `Length must be <= ${constraints.maxLength}.`,
      meta: { provided: value.length }
    });
  }

  if (constraints?.pattern && !constraints.pattern.test(value)) {
    violations.push({ code: 'string.pattern', message: `Value does not match required pattern ${constraints.pattern}.` });
  }

  if (violations.length > 0) {
    return { valid: false, errors: violations };
  }

  return { valid: true, value };
}

function validateNumberSlot(slotName: string, schema: NumberSlotSchema, value: unknown): SlotValidationOutcome<number> {
  if (value === undefined || value === null) {
    if (schema.defaultValue !== undefined) {
      return { valid: true, value: schema.defaultValue };
    }
    if (schema.optional) {
      return {
        valid: false,
        errors: [{ code: 'slot.required', message: `Slot \"${slotName}\" is optional but requires a defaultValue for numeric slots.` }]
      };
    }
    return { valid: false, errors: [{ code: 'slot.required', message: `Slot \"${slotName}\" is required.` }] };
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    return {
      valid: false,
      errors: [{ code: 'slot.type', message: `Slot \"${slotName}\" must be a finite number.` }]
    };
  }

  const constraints = schema.constraints;
  const violations: SlotErrorDetail[] = [];

  if (constraints?.min !== undefined && value < constraints.min) {
    violations.push({ code: 'number.min', message: `Value must be >= ${constraints.min}.`, meta: { provided: value } });
  }

  if (constraints?.max !== undefined && value > constraints.max) {
    violations.push({ code: 'number.max', message: `Value must be <= ${constraints.max}.`, meta: { provided: value } });
  }

  if (violations.length > 0) {
    return { valid: false, errors: violations };
  }

  return { valid: true, value };
}

function validateBooleanSlot(slotName: string, schema: BooleanSlotSchema, value: unknown): SlotValidationOutcome<boolean> {
  if (value === undefined || value === null) {
    if (schema.defaultValue !== undefined) {
      return { valid: true, value: schema.defaultValue };
    }
    if (schema.optional) {
      return {
        valid: false,
        errors: [{ code: 'slot.required', message: `Slot \"${slotName}\" is optional but requires a defaultValue for boolean slots.` }]
      };
    }
    return { valid: false, errors: [{ code: 'slot.required', message: `Slot \"${slotName}\" is required.` }] };
  }

  if (typeof value !== 'boolean') {
    return { valid: false, errors: [{ code: 'slot.type', message: `Slot \"${slotName}\" must be a boolean.` }] };
  }

  return { valid: true, value };
}

function validateEnumSlot(slotName: string, schema: EnumSlotSchema<string>, value: unknown): SlotValidationOutcome<string> {
  if (value === undefined || value === null) {
    if (schema.defaultValue !== undefined) {
      return { valid: true, value: schema.defaultValue };
    }
    if (schema.optional) {
      return {
        valid: false,
        errors: [{ code: 'slot.required', message: `Slot \"${slotName}\" is optional but requires a defaultValue for enum slots.` }]
      };
    }
    return { valid: false, errors: [{ code: 'slot.required', message: `Slot \"${slotName}\" is required.` }] };
  }

  if (typeof value !== 'string') {
    return { valid: false, errors: [{ code: 'slot.type', message: `Slot \"${slotName}\" must be a string literal.` }] };
  }

  if (!schema.values.includes(value)) {
    return {
      valid: false,
      errors: [{ code: 'enum.value', message: `Value must be one of: ${schema.values.join(', ')}.` }]
    };
  }

  return { valid: true, value };
}

function renderTemplate<TSlots extends SlotSchemaMap>(template: string, values: SlotValues<TSlots>): string {
  return template.replace(PLACEHOLDER_REGEX, (_match, group: string) => {
    const key = group.trim() as keyof TSlots;
    const value = values[key];
    if (value === undefined || value === null) {
      return '';
    }
    return typeof value === 'string' ? value : String(value);
  });
}
