export interface ParameterizedQuery {
  /** The parameterized SQL or DSL statement produced by a macro. */
  readonly text: string;
  /** The positional bind values to be passed into the database driver. */
  readonly values: ReadonlyArray<unknown>;
}

export type MacroName =
  | 'entityById'
  | 'entitiesByForeignKey'
  | 'searchByPrefix'
  | 'listActive';

export type PolicyId = 'SRPL-001' | 'SRPL-002' | 'SRPL-003' | 'SRPL-004';

export interface MacroDefinition<Input> {
  readonly name: MacroName;
  readonly policy: PolicyId;
  build(input: Input): ParameterizedQuery;
}

export interface MacroInvocationMetadata<Input> {
  readonly definition: MacroDefinition<Input>;
  readonly input: Input;
  readonly emitted: ParameterizedQuery;
}
