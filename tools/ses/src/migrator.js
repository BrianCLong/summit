"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMigrationScripts = generateMigrationScripts;
exports.applyMigrationsToFixture = applyMigrationsToFixture;
function buildRenameSQL(table, from, to) {
    return `ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to};`;
}
function buildSplitSQL(table, column, into) {
    const addColumns = into.map((target) => `ALTER TABLE ${table} ADD COLUMN ${target.name} ${target.type.toUpperCase()};`);
    const dropSource = `-- Manual verification required before dropping column ${column}`;
    return [...addColumns, dropSource].join('\n');
}
function buildWidenSQL(table, column, newType) {
    return `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${newType.toUpperCase()};`;
}
function buildRenameStub(table, from, to) {
    return `export async function migrate_${table}_${from}_to_${to}(row: Record<string, unknown>) {
  if (Object.prototype.hasOwnProperty.call(row, '${from}')) {
    row['${to}'] = row['${from}'];
    delete row['${from}'];
  }
  return row;
}`;
}
function buildSplitStub(table, column, into) {
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
function buildWidenStub(table, column, newType) {
    return `export async function migrate_${table}_${column}_widen(row: Record<string, unknown>) {
  // Type widening handled by database; ensure downstream typing to ${newType}
  return row;
}`;
}
function assertTableExists(schema, table) {
    const exists = schema.tables.some((t) => t.name === table);
    if (!exists) {
        throw new Error(`Table ${table} does not exist in schema definition`);
    }
}
function assertColumnExists(schema, table, column) {
    const tbl = schema.tables.find((t) => t.name === table);
    if (!tbl) {
        throw new Error(`Table ${table} does not exist in schema definition`);
    }
    const exists = tbl.columns.some((col) => col.name === column);
    if (!exists) {
        throw new Error(`Column ${table}.${column} does not exist in schema definition`);
    }
}
function generateMigrationScripts(schema, changes) {
    const migrations = [];
    for (const change of changes) {
        assertTableExists(schema, change.table);
        if (change.type === 'rename') {
            const rename = change;
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
            const split = change;
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
            const widen = change;
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
function cloneDataset(dataset) {
    const tables = {};
    for (const [tableName, rows] of Object.entries(dataset.tables)) {
        tables[tableName] = rows.map((row) => ({ ...row }));
    }
    return { tables };
}
function applyMigrationsToFixture(dataset, bundle) {
    const result = cloneDataset(dataset);
    for (const migration of bundle.migrations) {
        const rows = result.tables[migration.table];
        if (!rows)
            continue;
        if (migration.changeType === 'rename') {
            const from = migration.details?.from;
            const to = migration.details?.to;
            for (const row of rows) {
                if (from && to && row[from] !== undefined) {
                    row[to] = row[from];
                    delete row[from];
                }
            }
        }
        if (migration.changeType === 'split') {
            const column = migration.details?.column;
            const into = (migration.details?.into ?? []);
            for (const row of rows) {
                if (!column)
                    continue;
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
