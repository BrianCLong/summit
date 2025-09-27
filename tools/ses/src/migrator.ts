import type {
  SchemaDefinition,
  SchemaChange,
  MigrationBundle,
  MigrationScript,
  FixtureDataset,
  RenameChange,
  SplitChange,
  WidenChange,
} from './types.js';

function buildRenameSQL(table: string, from: string, to: string): string {
  return `ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to};`;
}

function buildSplitSQL(table: string, column: string, into: { name: string; type: string }[]): string {
  const addColumns = into.map((target) => `ALTER TABLE ${table} ADD COLUMN ${target.name} ${target.type.toUpperCase()};`);
  const dropSource = `-- Manual verification required before dropping column ${column}`;
  return [...addColumns, dropSource].join('\n');
}

function buildWidenSQL(table: string, column: string, newType: string): string {
  return `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${newType.toUpperCase()};`;
}

function buildRenameStub(table: string, from: string, to: string): string {
  return `export async function migrate_${table}_${from}_to_${to}(row: Record<string, unknown>) {
  if (Object.prototype.hasOwnProperty.call(row, '${from}')) {
    row['${to}'] = row['${from}'];
    delete row['${from}'];
  }
  return row;
}`;
}

function buildSplitStub(table: string, column: string, into: { name: string }[]): string {
  const assignments = into
    .map((target, index) => `  row['${target.name}'] = parts[${index}] ?? null;`)
    .join('\n');
  return `export async function migrate_${table}_${column}_split(row: Record<string, unknown>) {
  if (typeof row['${column}'] === 'string') {
    const parts = String(row['${column}']).split(/\\s+/);
${assignments}
  }
  return row;
}`;
}

function buildWidenStub(table: string, column: string, newType: string): string {
  return `export async function migrate_${table}_${column}_widen(row: Record<string, unknown>) {
  // Type widening handled by database; ensure downstream typing to ${newType}
  return row;
}`;
}

function assertTableExists(schema: SchemaDefinition, table: string): void {
  const exists = schema.tables.some((t) => t.name === table);
  if (!exists) {
    throw new Error(`Table ${table} does not exist in schema definition`);
  }
}

function assertColumnExists(schema: SchemaDefinition, table: string, column: string): void {
  const tbl = schema.tables.find((t) => t.name === table);
  if (!tbl) {
    throw new Error(`Table ${table} does not exist in schema definition`);
  }
  const exists = tbl.columns.some((col) => col.name === column);
  if (!exists) {
    throw new Error(`Column ${table}.${column} does not exist in schema definition`);
  }
}

export function generateMigrationScripts(
  schema: SchemaDefinition,
  changes: SchemaChange[],
): MigrationBundle {
  const migrations: MigrationScript[] = [];

  for (const change of changes) {
    assertTableExists(schema, change.table);
    if (change.type === 'rename') {
      const rename = change as RenameChange;
      assertColumnExists(schema, rename.table, rename.from);
      migrations.push({
        table: rename.table,
        changeType: rename.type,
        sql: buildRenameSQL(rename.table, rename.from, rename.to),
        codeStub: buildRenameStub(rename.table, rename.from, rename.to),
        details: { from: rename.from, to: rename.to },
      });
    }

    if (change.type === 'split') {
      const split = change as SplitChange;
      assertColumnExists(schema, split.table, split.column);
      migrations.push({
        table: split.table,
        changeType: split.type,
        sql: buildSplitSQL(split.table, split.column, split.into),
        codeStub: buildSplitStub(split.table, split.column, split.into),
        details: { column: split.column, into: split.into.map((target) => target.name) },
      });
    }

    if (change.type === 'widen') {
      const widen = change as WidenChange;
      assertColumnExists(schema, widen.table, widen.column);
      migrations.push({
        table: widen.table,
        changeType: widen.type,
        sql: buildWidenSQL(widen.table, widen.column, widen.newType),
        codeStub: buildWidenStub(widen.table, widen.column, widen.newType),
        details: { column: widen.column, newType: widen.newType },
      });
    }
  }

  return { migrations };
}

function cloneDataset(dataset: FixtureDataset): FixtureDataset {
  const tables: FixtureDataset['tables'] = {};
  for (const [tableName, rows] of Object.entries(dataset.tables)) {
    tables[tableName] = rows.map((row) => ({ ...row }));
  }
  return { tables };
}

export function applyMigrationsToFixture(
  dataset: FixtureDataset,
  bundle: MigrationBundle,
): FixtureDataset {
  const result = cloneDataset(dataset);

  for (const migration of bundle.migrations) {
    const rows = result.tables[migration.table];
    if (!rows) continue;

    if (migration.changeType === 'rename') {
      const from = (migration.details as { from?: string })?.from;
      const to = (migration.details as { to?: string })?.to;
      for (const row of rows) {
        if (from && to && row[from] !== undefined) {
          row[to] = row[from];
          delete row[from];
        }
      }
    }

    if (migration.changeType === 'split') {
      const column = (migration.details as { column?: string })?.column;
      const into = ((migration.details as { into?: string[] })?.into ?? []) as string[];
      for (const row of rows) {
        if (!column) continue;
        const sourceValue = row[column];
        if (typeof sourceValue === 'string') {
          const parts = String(sourceValue).split(/\s+/);
          into.forEach((target, index) => {
            row[target] = parts[index] ?? null;
          });
        }
      }
    }

    if (migration.changeType === 'widen') {
      // No data mutation required for widening in fixtures.
      continue;
    }
  }

  return result;
}
