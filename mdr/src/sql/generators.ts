import { Dialect, MetricSpec } from '../types';
import { formatFilterValue, quoteIdentifier } from '../utils';

type SqlPieces = {
  selectClause: string;
  fromClause: string;
  whereClause?: string;
  groupByClause?: string;
};

const DIALECT_MEASURE_TYPE: Record<Dialect, Record<string, string>> = {
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

function normalizeType(dialect: Dialect, rawType: string): string {
  const lower = rawType.toLowerCase();
  return DIALECT_MEASURE_TYPE[dialect][lower] ?? rawType;
}

export function buildSqlPieces(spec: MetricSpec, dialect: Dialect): SqlPieces {
  const grainColumns = spec.grain.map(column => quoteIdentifier(dialect, column.column));
  const measureExpressions = spec.measures.map(measure =>
    `${measure.expression} AS ${quoteIdentifier(dialect, measure.name)}`
  );

  const selectLines = [...grainColumns, ...measureExpressions];
  const selectClause = selectLines
    .map((line, index) => (index === selectLines.length - 1 ? `  ${line}` : `  ${line},`))
    .join('\n');

  const fromClause = `FROM ${spec.source}`;

  const conditions = (spec.filters ?? []).map(filter => {
    const lhs = quoteIdentifier(dialect, filter.column);
    if (filter.operator === 'IN' && Array.isArray(filter.value)) {
      return `${lhs} IN ${formatFilterValue(filter.value)}`;
    }
    return `${lhs} ${filter.operator} ${formatFilterValue(filter.value)}`;
  });

  const whereClause = conditions.length
    ? 'WHERE\n' +
      conditions
        .map((condition, index) => (index === 0 ? `  ${condition}` : `  AND ${condition}`))
        .join('\n')
    : undefined;

  const groupByClause = grainColumns.length
    ? 'GROUP BY\n' +
      grainColumns
        .map((column, index) => (index === grainColumns.length - 1 ? `  ${column}` : `  ${column},`))
        .join('\n')
    : undefined;

  return { selectClause, fromClause, whereClause, groupByClause };
}

export function renderViewSql(spec: MetricSpec, dialect: Dialect): string {
  if (spec.sqlGenerators?.[dialect]?.view) {
    return spec.sqlGenerators[dialect]!.view!;
  }
  const pieces = buildSqlPieces(spec, dialect);
  const viewName = `${spec.name}_v${spec.version}`;
  return [
    `CREATE OR REPLACE VIEW ${quoteIdentifier(dialect, viewName)} AS`,
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

export function renderUdfSql(spec: MetricSpec, dialect: Dialect): string {
  if (spec.sqlGenerators?.[dialect]?.udf) {
    return spec.sqlGenerators[dialect]!.udf!;
  }
  const pieces = buildSqlPieces(spec, dialect);
  const viewName = `${spec.name}_v${spec.version}`;
  const returnColumns = [
    ...spec.grain.map(column =>
      `${quoteIdentifier(dialect, column.column)} ${normalizeType(dialect, column.type)}`
    ),
    ...spec.measures.map(measure =>
      `${quoteIdentifier(dialect, measure.name)} ${normalizeType(dialect, measure.type)}`
    )
  ];

  if (dialect === 'bigquery') {
    return [
      `CREATE OR REPLACE FUNCTION ${quoteIdentifier(dialect, viewName)}()`,
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
      `CREATE OR REPLACE FUNCTION ${quoteIdentifier(dialect, viewName)}()`,
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
    `CREATE OR REPLACE FUNCTION ${quoteIdentifier(dialect, viewName)}()`,
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
