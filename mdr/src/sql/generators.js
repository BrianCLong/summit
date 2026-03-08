"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSqlPieces = buildSqlPieces;
exports.renderViewSql = renderViewSql;
exports.renderUdfSql = renderUdfSql;
const utils_1 = require("../utils");
const DIALECT_MEASURE_TYPE = {
    bigquery: {
        string: 'STRING',
        number: 'NUMERIC',
        integer: 'INT64',
        float: 'FLOAT64',
        boolean: 'BOOL',
        date: 'DATE',
        timestamp: 'TIMESTAMP'
    },
    snowflake: {
        string: 'VARCHAR',
        number: 'NUMBER',
        integer: 'NUMBER',
        float: 'FLOAT',
        boolean: 'BOOLEAN',
        date: 'DATE',
        timestamp: 'TIMESTAMP'
    },
    postgres: {
        string: 'TEXT',
        number: 'NUMERIC',
        integer: 'BIGINT',
        float: 'DOUBLE PRECISION',
        boolean: 'BOOLEAN',
        date: 'DATE',
        timestamp: 'TIMESTAMPTZ'
    }
};
function normalizeType(dialect, rawType) {
    const lower = rawType.toLowerCase();
    return DIALECT_MEASURE_TYPE[dialect][lower] ?? rawType;
}
function buildSqlPieces(spec, dialect) {
    const grainColumns = spec.grain.map(column => (0, utils_1.quoteIdentifier)(dialect, column.column));
    const measureExpressions = spec.measures.map(measure => `${measure.expression} AS ${(0, utils_1.quoteIdentifier)(dialect, measure.name)}`);
    const selectLines = [...grainColumns, ...measureExpressions];
    const selectClause = selectLines
        .map((line, index) => (index === selectLines.length - 1 ? `  ${line}` : `  ${line},`))
        .join('\n');
    const fromClause = `FROM ${spec.source}`;
    const conditions = (spec.filters ?? []).map(filter => {
        const lhs = (0, utils_1.quoteIdentifier)(dialect, filter.column);
        if (filter.operator === 'IN' && Array.isArray(filter.value)) {
            return `${lhs} IN ${(0, utils_1.formatFilterValue)(filter.value)}`;
        }
        return `${lhs} ${filter.operator} ${(0, utils_1.formatFilterValue)(filter.value)}`;
    });
    const whereClause = conditions.length
        ? `WHERE\n${conditions
            .map((condition, index) => (index === 0 ? `  ${condition}` : `  AND ${condition}`))
            .join('\n')}`
        : undefined;
    const groupByClause = grainColumns.length
        ? `GROUP BY\n${grainColumns
            .map((column, index) => (index === grainColumns.length - 1 ? `  ${column}` : `  ${column},`))
            .join('\n')}`
        : undefined;
    return { selectClause, fromClause, whereClause, groupByClause };
}
function renderViewSql(spec, dialect) {
    if (spec.sqlGenerators?.[dialect]?.view) {
        const dialectGenerators = spec.sqlGenerators[dialect];
        if (!dialectGenerators) {
            throw new Error(`No SQL generators defined for dialect: ${dialect}`);
        }
        return dialectGenerators.view;
    }
    const pieces = buildSqlPieces(spec, dialect);
    const viewName = `${spec.name}_v${spec.version}`;
    return [
        `CREATE OR REPLACE VIEW ${(0, utils_1.quoteIdentifier)(dialect, viewName)} AS`,
        'SELECT',
        pieces.selectClause,
        pieces.fromClause,
        pieces.whereClause,
        pieces.groupByClause,
        ';'
    ]
        .filter(Boolean)
        .join('\n');
}
function renderUdfSql(spec, dialect) {
    if (spec.sqlGenerators?.[dialect]?.udf) {
        const dialectGenerators = spec.sqlGenerators[dialect];
        if (!dialectGenerators) {
            throw new Error(`No SQL generators defined for dialect: ${dialect}`);
        }
        return dialectGenerators.udf;
    }
    const pieces = buildSqlPieces(spec, dialect);
    const viewName = `${spec.name}_v${spec.version}`;
    const returnColumns = [
        ...spec.grain.map(column => `${(0, utils_1.quoteIdentifier)(dialect, column.column)} ${normalizeType(dialect, column.type)}`),
        ...spec.measures.map(measure => `${(0, utils_1.quoteIdentifier)(dialect, measure.name)} ${normalizeType(dialect, measure.type)}`)
    ];
    if (dialect === 'bigquery') {
        return [
            `CREATE OR REPLACE FUNCTION ${(0, utils_1.quoteIdentifier)(dialect, viewName)}()`,
            `RETURNS TABLE<${returnColumns.join(', ')}>`,
            'AS (',
            'SELECT',
            pieces.selectClause,
            pieces.fromClause,
            pieces.whereClause,
            pieces.groupByClause,
            ');'
        ]
            .filter(Boolean)
            .join('\n');
    }
    if (dialect === 'snowflake') {
        return [
            `CREATE OR REPLACE FUNCTION ${(0, utils_1.quoteIdentifier)(dialect, viewName)}()`,
            'RETURNS TABLE (',
            returnColumns
                .map((column, index) => (index === returnColumns.length - 1 ? `  ${column}` : `  ${column},`))
                .join('\n'),
            ')',
            'AS',
            '$$',
            'SELECT',
            pieces.selectClause,
            pieces.fromClause,
            pieces.whereClause,
            pieces.groupByClause,
            '$$',
            'LANGUAGE SQL;'
        ]
            .filter(Boolean)
            .join('\n');
    }
    return [
        `CREATE OR REPLACE FUNCTION ${(0, utils_1.quoteIdentifier)(dialect, viewName)}()`,
        'RETURNS TABLE (',
        returnColumns
            .map((column, index) => (index === returnColumns.length - 1 ? `  ${column}` : `  ${column},`))
            .join('\n'),
        ')',
        'AS $$',
        'SELECT',
        pieces.selectClause,
        pieces.fromClause,
        pieces.whereClause,
        pieces.groupByClause,
        '$$ LANGUAGE SQL;'
    ]
        .filter(Boolean)
        .join('\n');
}
