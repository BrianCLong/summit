import type { MacroDefinition, MacroName, ParameterizedQuery, PolicyId } from './types.js';

type OrderDirection = 'ASC' | 'DESC';

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdentifier(value: string, field: string): string {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new TypeError(`Invalid identifier for ${field}: ${value}`);
  }
  return value;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function normalizeColumns(columns?: ReadonlyArray<string>): string[] | undefined {
  if (!columns || columns.length === 0) {
    return undefined;
  }
  return columns.map((column, index) => quoteIdentifier(assertIdentifier(column, `columns[${index}]`)));
}

function buildSelectList(columns?: ReadonlyArray<string>): string {
  if (!columns || columns.length === 0) {
    return '*';
  }
  return columns.join(', ');
}

function normalizeLimit(limit?: number): number | undefined {
  if (limit === undefined) {
    return undefined;
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new TypeError(`Limit must be a positive integer. Received: ${limit}`);
  }
  return limit;
}

function normalizeOrder(order?: OrderDirection): OrderDirection | undefined {
  if (!order) {
    return undefined;
  }
  return order === 'DESC' ? 'DESC' : 'ASC';
}

function createMacro<Input>(
  name: MacroName,
  policy: PolicyId,
  builder: (input: Input) => ParameterizedQuery,
): MacroDefinition<Input> {
  return Object.freeze({
    name,
    policy,
    build(input: Input): ParameterizedQuery {
      const emitted = builder(input);
      return {
        text: emitted.text,
        values: [...emitted.values],
      };
    },
  });
}

export interface EntityByIdInput {
  table: string;
  id: unknown;
  idColumn?: string;
  columns?: ReadonlyArray<string>;
}

const entityByIdDefinition = createMacro<EntityByIdInput>('entityById', 'SRPL-001', (input) => {
  const table = quoteIdentifier(assertIdentifier(input.table, 'table'));
  const idColumn = quoteIdentifier(assertIdentifier(input.idColumn ?? 'id', 'idColumn'));
  const columns = normalizeColumns(input.columns);
  const selectList = buildSelectList(columns);
  return {
    text: `SELECT ${selectList} FROM ${table} WHERE ${idColumn} = $1`,
    values: [input.id],
  };
});

export function entityById(input: EntityByIdInput): ParameterizedQuery {
  return entityByIdDefinition.build(input);
}

export interface EntitiesByForeignKeyInput {
  table: string;
  foreignKeyColumn: string;
  foreignKeyValue: unknown;
  columns?: ReadonlyArray<string>;
  limit?: number;
  sortColumn?: string;
  sortDirection?: OrderDirection;
}

const entitiesByForeignKeyDefinition = createMacro<EntitiesByForeignKeyInput>(
  'entitiesByForeignKey',
  'SRPL-002',
  (input) => {
    const table = quoteIdentifier(assertIdentifier(input.table, 'table'));
    const fkColumn = quoteIdentifier(assertIdentifier(input.foreignKeyColumn, 'foreignKeyColumn'));
    const columns = normalizeColumns(input.columns);
    const selectList = buildSelectList(columns);
    const limit = normalizeLimit(input.limit);
    const sortColumn = input.sortColumn
      ? quoteIdentifier(assertIdentifier(input.sortColumn, 'sortColumn'))
      : undefined;
    const sortDirection = normalizeOrder(input.sortDirection);

    let text = `SELECT ${selectList} FROM ${table} WHERE ${fkColumn} = $1`;
    if (sortColumn) {
      text += ` ORDER BY ${sortColumn} ${sortDirection ?? 'ASC'}`;
    }
    if (limit !== undefined) {
      text += ` LIMIT ${limit}`;
    }
    return {
      text,
      values: [input.foreignKeyValue],
    };
  },
);

export function entitiesByForeignKey(input: EntitiesByForeignKeyInput): ParameterizedQuery {
  return entitiesByForeignKeyDefinition.build(input);
}

export interface SearchByPrefixInput {
  table: string;
  column: string;
  prefix: string;
  columns?: ReadonlyArray<string>;
  limit?: number;
  caseSensitive?: boolean;
}

const searchByPrefixDefinition = createMacro<SearchByPrefixInput>('searchByPrefix', 'SRPL-003', (input) => {
  const table = quoteIdentifier(assertIdentifier(input.table, 'table'));
  const column = quoteIdentifier(assertIdentifier(input.column, 'column'));
  const columns = normalizeColumns(input.columns);
  const selectList = buildSelectList(columns);
  const limit = normalizeLimit(input.limit);
  const comparator = input.caseSensitive ? 'LIKE' : 'ILIKE';

  let text = `SELECT ${selectList} FROM ${table} WHERE ${column} ${comparator} $1`;
  if (limit !== undefined) {
    text += ` LIMIT ${limit}`;
  }
  return {
    text,
    values: [`${input.prefix}%`],
  };
});

export function searchByPrefix(input: SearchByPrefixInput): ParameterizedQuery {
  return searchByPrefixDefinition.build(input);
}

export interface ListActiveInput {
  table: string;
  activeValue?: unknown;
  activeColumn?: string;
  columns?: ReadonlyArray<string>;
  limit?: number;
  sortColumn?: string;
  sortDirection?: OrderDirection;
}

const listActiveDefinition = createMacro<ListActiveInput>('listActive', 'SRPL-004', (input) => {
  const table = quoteIdentifier(assertIdentifier(input.table, 'table'));
  const activeColumn = quoteIdentifier(assertIdentifier(input.activeColumn ?? 'is_active', 'activeColumn'));
  const columns = normalizeColumns(input.columns);
  const selectList = buildSelectList(columns);
  const limit = normalizeLimit(input.limit);
  const sortColumn = input.sortColumn
    ? quoteIdentifier(assertIdentifier(input.sortColumn, 'sortColumn'))
    : undefined;
  const sortDirection = normalizeOrder(input.sortDirection);

  let text = `SELECT ${selectList} FROM ${table} WHERE ${activeColumn} = $1`;
  if (sortColumn) {
    text += ` ORDER BY ${sortColumn} ${sortDirection ?? 'ASC'}`;
  }
  if (limit !== undefined) {
    text += ` LIMIT ${limit}`;
  }
  return {
    text,
    values: [input.activeValue ?? true],
  };
});

export function listActive(input: ListActiveInput): ParameterizedQuery {
  return listActiveDefinition.build(input);
}

export const macroRegistry: Record<MacroName, MacroDefinition<unknown>> = Object.freeze({
  entityById: entityByIdDefinition,
  entitiesByForeignKey: entitiesByForeignKeyDefinition,
  searchByPrefix: searchByPrefixDefinition,
  listActive: listActiveDefinition,
});

export type { OrderDirection };
