import type { PromptTemplate, PromptValidationResult } from '../compiler.js';
import type {
  SlotSchemaMap,
  SlotValues,
  PartialSlotValues,
} from '../schema.js';

export interface GeneratedTestCase<TSlots extends SlotSchemaMap> {
  readonly description: string;
  readonly slot: keyof TSlots | 'template';
  readonly values: PartialSlotValues<TSlots>;
  readonly expectValid: boolean;
}

export interface GeneratedTestSuite<TSlots extends SlotSchemaMap> {
  readonly name: string;
  readonly cases: readonly GeneratedTestCase<TSlots>[];
  readonly baseValues: SlotValues<TSlots>;
  run(template?: PromptTemplate<TSlots>): GeneratedTestResults<TSlots>;
  register(harness?: TestHarness): void;
}

export interface GeneratedTestResults<TSlots extends SlotSchemaMap> {
  readonly passed: boolean;
  readonly results: ReadonlyArray<GeneratedCaseResult<TSlots>>;
}

export interface GeneratedCaseResult<TSlots extends SlotSchemaMap> {
  readonly testCase: GeneratedTestCase<TSlots>;
  readonly passed: boolean;
  readonly error?: Error;
}

export interface TestHarness {
  describe(name: string, fn: () => void): void;
  it(name: string, fn: () => void): void;
  expect: (value: unknown) => {
    toThrow(error?: unknown): void;
    not: { toThrow(): void };
    toBe(value: unknown): void;
    toEqual(value: unknown): void;
  };
}

export interface TestGenerationOptions<TSlots extends SlotSchemaMap> {
  readonly suiteName?: string;
  readonly validExample?: SlotValues<TSlots>;
  readonly counterExamples?: Partial<Record<keyof TSlots, readonly unknown[]>>;
}

export interface ValidationProbe<TSlots extends SlotSchemaMap> {
  template: PromptTemplate<TSlots>;
  values: PartialSlotValues<TSlots>;
  validation: PromptValidationResult<TSlots>;
}
