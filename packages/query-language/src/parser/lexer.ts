/**
 * Summit Query Language Lexer
 *
 * Tokenizes SummitQL queries using Chevrotain
 */

import { createToken, Lexer, TokenType } from 'chevrotain';

// ===== Keywords =====

export const Query = createToken({ name: 'Query', pattern: /query/i });
export const From = createToken({ name: 'From', pattern: /from/i });
export const Where = createToken({ name: 'Where', pattern: /where/i });
export const And = createToken({ name: 'And', pattern: /and/i });
export const Or = createToken({ name: 'Or', pattern: /or/i });
export const Not = createToken({ name: 'Not', pattern: /not/i });
export const In = createToken({ name: 'In', pattern: /in/i });
export const Like = createToken({ name: 'Like', pattern: /like/i });
export const Between = createToken({ name: 'Between', pattern: /between/i });
export const OrderBy = createToken({ name: 'OrderBy', pattern: /order\s+by/i });
export const GroupBy = createToken({ name: 'GroupBy', pattern: /group\s+by/i });
export const Limit = createToken({ name: 'Limit', pattern: /limit/i });
export const Offset = createToken({ name: 'Offset', pattern: /offset/i });
export const Join = createToken({ name: 'Join', pattern: /join/i });
export const LeftJoin = createToken({ name: 'LeftJoin', pattern: /left\s+join/i });
export const RightJoin = createToken({ name: 'RightJoin', pattern: /right\s+join/i });
export const FullJoin = createToken({ name: 'FullJoin', pattern: /full\s+join/i });
export const On = createToken({ name: 'On', pattern: /on/i });
export const As = createToken({ name: 'As', pattern: /as/i });
export const Select = createToken({ name: 'Select', pattern: /select/i });
export const Aggregate = createToken({ name: 'Aggregate', pattern: /aggregate/i });
export const Fragment = createToken({ name: 'Fragment', pattern: /fragment/i });
export const Temporal = createToken({ name: 'Temporal', pattern: /temporal/i });
export const Geospatial = createToken({ name: 'Geospatial', pattern: /geospatial/i });
export const Within = createToken({ name: 'Within', pattern: /within/i });
export const Intersects = createToken({ name: 'Intersects', pattern: /intersects/i });
export const Near = createToken({ name: 'Near', pattern: /near/i });
export const Contains = createToken({ name: 'Contains', pattern: /contains/i });
export const Search = createToken({ name: 'Search', pattern: /search/i });
export const Match = createToken({ name: 'Match', pattern: /match/i });
export const PointInTime = createToken({ name: 'PointInTime', pattern: /point_in_time/i });
export const TimeRange = createToken({ name: 'TimeRange', pattern: /time_range/i });
export const Asc = createToken({ name: 'Asc', pattern: /asc/i });
export const Desc = createToken({ name: 'Desc', pattern: /desc/i });
export const Nulls = createToken({ name: 'Nulls', pattern: /nulls/i });
export const First = createToken({ name: 'First', pattern: /first/i });
export const Last = createToken({ name: 'Last', pattern: /last/i });
export const Exists = createToken({ name: 'Exists', pattern: /exists/i });
export const Any = createToken({ name: 'Any', pattern: /any/i });
export const All = createToken({ name: 'All', pattern: /all/i });
export const Distinct = createToken({ name: 'Distinct', pattern: /distinct/i });

// ===== Aggregation Functions =====

export const Count = createToken({ name: 'Count', pattern: /count/i });
export const Sum = createToken({ name: 'Sum', pattern: /sum/i });
export const Avg = createToken({ name: 'Avg', pattern: /avg/i });
export const Min = createToken({ name: 'Min', pattern: /min/i });
export const Max = createToken({ name: 'Max', pattern: /max/i });
export const Histogram = createToken({ name: 'Histogram', pattern: /histogram/i });
export const Percentiles = createToken({ name: 'Percentiles', pattern: /percentiles/i });

// ===== Operators =====

export const Equals = createToken({ name: 'Equals', pattern: /==|=/ });
export const NotEquals = createToken({ name: 'NotEquals', pattern: /!=|<>/ });
export const GreaterThan = createToken({ name: 'GreaterThan', pattern: />/ });
export const GreaterThanOrEqual = createToken({ name: 'GreaterThanOrEqual', pattern: />=/ });
export const LessThan = createToken({ name: 'LessThan', pattern: /</ });
export const LessThanOrEqual = createToken({ name: 'LessThanOrEqual', pattern: /<=/ });

// ===== Symbols =====

export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
export const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });
export const Arrow = createToken({ name: 'Arrow', pattern: /->/ });
export const At = createToken({ name: 'At', pattern: /@/ });
export const Dollar = createToken({ name: 'Dollar', pattern: /\$/ });

// ===== Literals =====

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/,
});

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?\d+\.?\d*([eE][+-]?\d+)?/,
});

export const BooleanLiteral = createToken({
  name: 'BooleanLiteral',
  pattern: /true|false/i,
});

export const NullLiteral = createToken({
  name: 'NullLiteral',
  pattern: /null/i,
});

export const DateLiteral = createToken({
  name: 'DateLiteral',
  pattern: /\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?/,
});

// ===== Identifiers =====

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});

// ===== Whitespace and Comments =====

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const LineComment = createToken({
  name: 'LineComment',
  pattern: /\/\/[^\n\r]*/,
  group: Lexer.SKIPPED,
});

export const BlockComment = createToken({
  name: 'BlockComment',
  pattern: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//,
  group: Lexer.SKIPPED,
});

// ===== Token Array (order matters!) =====

export const allTokens: TokenType[] = [
  // Whitespace and Comments (first to skip)
  WhiteSpace,
  LineComment,
  BlockComment,

  // Multi-word keywords (before single-word to avoid partial matches)
  OrderBy,
  GroupBy,
  LeftJoin,
  RightJoin,
  FullJoin,
  PointInTime,
  TimeRange,

  // Keywords
  Query,
  From,
  Where,
  And,
  Or,
  Not,
  In,
  Like,
  Between,
  Join,
  On,
  As,
  Select,
  Aggregate,
  Fragment,
  Temporal,
  Geospatial,
  Within,
  Intersects,
  Near,
  Contains,
  Search,
  Match,
  Limit,
  Offset,
  Asc,
  Desc,
  Nulls,
  First,
  Last,
  Exists,
  Any,
  All,
  Distinct,

  // Aggregation Functions
  Count,
  Sum,
  Avg,
  Min,
  Max,
  Histogram,
  Percentiles,

  // Operators (order matters for multi-char operators)
  GreaterThanOrEqual,
  LessThanOrEqual,
  NotEquals,
  Equals,
  GreaterThan,
  LessThan,

  // Symbols
  Arrow,
  LParen,
  RParen,
  LBrace,
  RBrace,
  LBracket,
  RBracket,
  Comma,
  Colon,
  Semicolon,
  Dot,
  At,
  Dollar,

  // Literals (before Identifier to match first)
  DateLiteral,
  BooleanLiteral,
  NullLiteral,
  NumberLiteral,
  StringLiteral,

  // Identifier (last, catches everything else)
  Identifier,
];

// ===== Create Lexer Instance =====

export const SummitQLLexer = new Lexer(allTokens, {
  positionTracking: 'full',
  ensureOptimizations: true,
});

// ===== Export Tokenization Function =====

export function tokenize(text: string) {
  const lexingResult = SummitQLLexer.tokenize(text);

  if (lexingResult.errors.length > 0) {
    throw new Error(
      `Lexer errors:\n${lexingResult.errors.map((e) => e.message).join('\n')}`
    );
  }

  return lexingResult;
}
