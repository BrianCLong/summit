/**
 * Minimal JSON Schema to TypeScript converter used for deriving
 * strong types from the repository's existing schema assets without
 * adding runtime dependencies.
 */
export type JsonSchema = {
  readonly type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
  readonly enum?: readonly unknown[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly items?: JsonSchema;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean | JsonSchema;
};

export type FromSchema<S extends JsonSchema> = SchemaType<S>;

type SchemaType<S extends JsonSchema> = S['enum'] extends readonly unknown[]
  ? S['enum'][number]
  : S['type'] extends 'string'
    ? string
    : S['type'] extends 'number' | 'integer'
      ? number
      : S['type'] extends 'boolean'
        ? boolean
        : S['type'] extends 'array'
          ? S['items'] extends JsonSchema
            ? SchemaType<S['items']>[]
            : unknown[]
          : S['type'] extends 'object'
            ? Simplify<
                ObjectShape<S> &
                  (S['additionalProperties'] extends false | undefined
                    ? Record<never, never>
                    : S['additionalProperties'] extends JsonSchema
                      ? Record<string, SchemaType<S['additionalProperties']>>
                      : Record<string, unknown>)
              >
            : unknown;

type ObjectShape<S extends JsonSchema> = S['properties'] extends Record<string, JsonSchema>
  ? {
      [K in keyof S['properties'] as K extends string ? K : never]: K extends RequiredKeys<S>
        ? SchemaType<S['properties'][K]>
        : SchemaType<S['properties'][K]> | undefined;
    }
  : Record<string, unknown>;

type RequiredKeys<S extends JsonSchema> = S['required'] extends readonly (infer R)[]
  ? Extract<R, string>
  : never;

type Simplify<T> = { [K in keyof T]: T[K] };
