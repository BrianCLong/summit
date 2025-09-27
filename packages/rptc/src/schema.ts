import type { SlotErrorDetail } from './errors.js';

export type SlotKind = 'string' | 'number' | 'enum' | 'boolean';

export interface BaseSlotSchema<T> {
  readonly kind: SlotKind;
  readonly description?: string;
  readonly optional?: boolean;
  readonly defaultValue?: T;
  readonly example?: T;
  readonly counterExamples?: readonly unknown[];
}

export interface StringConstraints {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: RegExp;
}

export interface NumberConstraints {
  readonly min?: number;
  readonly max?: number;
}

export interface StringSlotSchema extends BaseSlotSchema<string> {
  readonly kind: 'string';
  readonly constraints?: StringConstraints;
}

export interface NumberSlotSchema extends BaseSlotSchema<number> {
  readonly kind: 'number';
  readonly constraints?: NumberConstraints;
}

export interface BooleanSlotSchema extends BaseSlotSchema<boolean> {
  readonly kind: 'boolean';
}

export interface EnumSlotSchema<T extends string> extends BaseSlotSchema<T> {
  readonly kind: 'enum';
  readonly values: readonly T[];
}

export type SlotSchema = StringSlotSchema | NumberSlotSchema | BooleanSlotSchema | EnumSlotSchema<string>;

export type SlotSchemaMap = Record<string, SlotSchema>;

export type SlotValue<S extends SlotSchema> = S extends StringSlotSchema
  ? string
  : S extends NumberSlotSchema
    ? number
    : S extends BooleanSlotSchema
      ? boolean
      : S extends EnumSlotSchema<infer T>
        ? T
        : never;

export type SlotValues<TSlots extends SlotSchemaMap> = {
  [K in keyof TSlots]: SlotValue<TSlots[K]>;
};

export type PartialSlotValues<TSlots extends SlotSchemaMap> = Partial<SlotValues<TSlots>>;

export interface SlotValidationSuccess<T> {
  readonly valid: true;
  readonly value: T;
}

export interface SlotValidationFailure {
  readonly valid: false;
  readonly errors: SlotErrorDetail[];
}

export type SlotValidationOutcome<T> = SlotValidationSuccess<T> | SlotValidationFailure;

export function stringSlot(options: Omit<StringSlotSchema, 'kind'> = {}): StringSlotSchema {
  return { kind: 'string', ...options };
}

export function numberSlot(options: Omit<NumberSlotSchema, 'kind'> = {}): NumberSlotSchema {
  return { kind: 'number', ...options };
}

export function booleanSlot(options: Omit<BooleanSlotSchema, 'kind'> = {}): BooleanSlotSchema {
  return { kind: 'boolean', ...options };
}

export function enumSlot<T extends string>(values: readonly T[], options: Omit<EnumSlotSchema<T>, 'kind' | 'values'> = {}): EnumSlotSchema<T> {
  return { kind: 'enum', values, ...options };
}
