"use strict";
/**
 * Summit Query Language Lexer
 *
 * Tokenizes SummitQL queries using Chevrotain
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotEquals = exports.Equals = exports.Percentiles = exports.Histogram = exports.Max = exports.Min = exports.Avg = exports.Sum = exports.Count = exports.Distinct = exports.All = exports.Any = exports.Exists = exports.Last = exports.First = exports.Nulls = exports.Desc = exports.Asc = exports.TimeRange = exports.PointInTime = exports.Match = exports.Search = exports.Contains = exports.Near = exports.Intersects = exports.Within = exports.Geospatial = exports.Temporal = exports.Fragment = exports.Aggregate = exports.Select = exports.As = exports.On = exports.FullJoin = exports.RightJoin = exports.LeftJoin = exports.Join = exports.Offset = exports.Limit = exports.GroupBy = exports.OrderBy = exports.Between = exports.Like = exports.In = exports.Not = exports.Or = exports.And = exports.Where = exports.From = exports.Query = void 0;
exports.SummitQLLexer = exports.allTokens = exports.BlockComment = exports.LineComment = exports.WhiteSpace = exports.Identifier = exports.DateLiteral = exports.NullLiteral = exports.BooleanLiteral = exports.NumberLiteral = exports.StringLiteral = exports.Dollar = exports.At = exports.Arrow = exports.Dot = exports.Semicolon = exports.Colon = exports.Comma = exports.RBracket = exports.LBracket = exports.RBrace = exports.LBrace = exports.RParen = exports.LParen = exports.LessThanOrEqual = exports.LessThan = exports.GreaterThanOrEqual = exports.GreaterThan = void 0;
exports.tokenize = tokenize;
const chevrotain_1 = require("chevrotain");
// ===== Keywords =====
exports.Query = (0, chevrotain_1.createToken)({ name: 'Query', pattern: /query/i });
exports.From = (0, chevrotain_1.createToken)({ name: 'From', pattern: /from/i });
exports.Where = (0, chevrotain_1.createToken)({ name: 'Where', pattern: /where/i });
exports.And = (0, chevrotain_1.createToken)({ name: 'And', pattern: /and/i });
exports.Or = (0, chevrotain_1.createToken)({ name: 'Or', pattern: /or/i });
exports.Not = (0, chevrotain_1.createToken)({ name: 'Not', pattern: /not/i });
exports.In = (0, chevrotain_1.createToken)({ name: 'In', pattern: /in/i });
exports.Like = (0, chevrotain_1.createToken)({ name: 'Like', pattern: /like/i });
exports.Between = (0, chevrotain_1.createToken)({ name: 'Between', pattern: /between/i });
exports.OrderBy = (0, chevrotain_1.createToken)({ name: 'OrderBy', pattern: /order\s+by/i });
exports.GroupBy = (0, chevrotain_1.createToken)({ name: 'GroupBy', pattern: /group\s+by/i });
exports.Limit = (0, chevrotain_1.createToken)({ name: 'Limit', pattern: /limit/i });
exports.Offset = (0, chevrotain_1.createToken)({ name: 'Offset', pattern: /offset/i });
exports.Join = (0, chevrotain_1.createToken)({ name: 'Join', pattern: /join/i });
exports.LeftJoin = (0, chevrotain_1.createToken)({ name: 'LeftJoin', pattern: /left\s+join/i });
exports.RightJoin = (0, chevrotain_1.createToken)({ name: 'RightJoin', pattern: /right\s+join/i });
exports.FullJoin = (0, chevrotain_1.createToken)({ name: 'FullJoin', pattern: /full\s+join/i });
exports.On = (0, chevrotain_1.createToken)({ name: 'On', pattern: /on/i });
exports.As = (0, chevrotain_1.createToken)({ name: 'As', pattern: /as/i });
exports.Select = (0, chevrotain_1.createToken)({ name: 'Select', pattern: /select/i });
exports.Aggregate = (0, chevrotain_1.createToken)({ name: 'Aggregate', pattern: /aggregate/i });
exports.Fragment = (0, chevrotain_1.createToken)({ name: 'Fragment', pattern: /fragment/i });
exports.Temporal = (0, chevrotain_1.createToken)({ name: 'Temporal', pattern: /temporal/i });
exports.Geospatial = (0, chevrotain_1.createToken)({ name: 'Geospatial', pattern: /geospatial/i });
exports.Within = (0, chevrotain_1.createToken)({ name: 'Within', pattern: /within/i });
exports.Intersects = (0, chevrotain_1.createToken)({ name: 'Intersects', pattern: /intersects/i });
exports.Near = (0, chevrotain_1.createToken)({ name: 'Near', pattern: /near/i });
exports.Contains = (0, chevrotain_1.createToken)({ name: 'Contains', pattern: /contains/i });
exports.Search = (0, chevrotain_1.createToken)({ name: 'Search', pattern: /search/i });
exports.Match = (0, chevrotain_1.createToken)({ name: 'Match', pattern: /match/i });
exports.PointInTime = (0, chevrotain_1.createToken)({ name: 'PointInTime', pattern: /point_in_time/i });
exports.TimeRange = (0, chevrotain_1.createToken)({ name: 'TimeRange', pattern: /time_range/i });
exports.Asc = (0, chevrotain_1.createToken)({ name: 'Asc', pattern: /asc/i });
exports.Desc = (0, chevrotain_1.createToken)({ name: 'Desc', pattern: /desc/i });
exports.Nulls = (0, chevrotain_1.createToken)({ name: 'Nulls', pattern: /nulls/i });
exports.First = (0, chevrotain_1.createToken)({ name: 'First', pattern: /first/i });
exports.Last = (0, chevrotain_1.createToken)({ name: 'Last', pattern: /last/i });
exports.Exists = (0, chevrotain_1.createToken)({ name: 'Exists', pattern: /exists/i });
exports.Any = (0, chevrotain_1.createToken)({ name: 'Any', pattern: /any/i });
exports.All = (0, chevrotain_1.createToken)({ name: 'All', pattern: /all/i });
exports.Distinct = (0, chevrotain_1.createToken)({ name: 'Distinct', pattern: /distinct/i });
// ===== Aggregation Functions =====
exports.Count = (0, chevrotain_1.createToken)({ name: 'Count', pattern: /count/i });
exports.Sum = (0, chevrotain_1.createToken)({ name: 'Sum', pattern: /sum/i });
exports.Avg = (0, chevrotain_1.createToken)({ name: 'Avg', pattern: /avg/i });
exports.Min = (0, chevrotain_1.createToken)({ name: 'Min', pattern: /min/i });
exports.Max = (0, chevrotain_1.createToken)({ name: 'Max', pattern: /max/i });
exports.Histogram = (0, chevrotain_1.createToken)({ name: 'Histogram', pattern: /histogram/i });
exports.Percentiles = (0, chevrotain_1.createToken)({ name: 'Percentiles', pattern: /percentiles/i });
// ===== Operators =====
exports.Equals = (0, chevrotain_1.createToken)({ name: 'Equals', pattern: /==|=/ });
exports.NotEquals = (0, chevrotain_1.createToken)({ name: 'NotEquals', pattern: /!=|<>/ });
exports.GreaterThan = (0, chevrotain_1.createToken)({ name: 'GreaterThan', pattern: />/ });
exports.GreaterThanOrEqual = (0, chevrotain_1.createToken)({ name: 'GreaterThanOrEqual', pattern: />=/ });
exports.LessThan = (0, chevrotain_1.createToken)({ name: 'LessThan', pattern: /</ });
exports.LessThanOrEqual = (0, chevrotain_1.createToken)({ name: 'LessThanOrEqual', pattern: /<=/ });
// ===== Symbols =====
exports.LParen = (0, chevrotain_1.createToken)({ name: 'LParen', pattern: /\(/ });
exports.RParen = (0, chevrotain_1.createToken)({ name: 'RParen', pattern: /\)/ });
exports.LBrace = (0, chevrotain_1.createToken)({ name: 'LBrace', pattern: /\{/ });
exports.RBrace = (0, chevrotain_1.createToken)({ name: 'RBrace', pattern: /\}/ });
exports.LBracket = (0, chevrotain_1.createToken)({ name: 'LBracket', pattern: /\[/ });
exports.RBracket = (0, chevrotain_1.createToken)({ name: 'RBracket', pattern: /\]/ });
exports.Comma = (0, chevrotain_1.createToken)({ name: 'Comma', pattern: /,/ });
exports.Colon = (0, chevrotain_1.createToken)({ name: 'Colon', pattern: /:/ });
exports.Semicolon = (0, chevrotain_1.createToken)({ name: 'Semicolon', pattern: /;/ });
exports.Dot = (0, chevrotain_1.createToken)({ name: 'Dot', pattern: /\./ });
exports.Arrow = (0, chevrotain_1.createToken)({ name: 'Arrow', pattern: /->/ });
exports.At = (0, chevrotain_1.createToken)({ name: 'At', pattern: /@/ });
exports.Dollar = (0, chevrotain_1.createToken)({ name: 'Dollar', pattern: /\$/ });
// ===== Literals =====
exports.StringLiteral = (0, chevrotain_1.createToken)({
    name: 'StringLiteral',
    pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/,
});
exports.NumberLiteral = (0, chevrotain_1.createToken)({
    name: 'NumberLiteral',
    pattern: /-?\d+\.?\d*([eE][+-]?\d+)?/,
});
exports.BooleanLiteral = (0, chevrotain_1.createToken)({
    name: 'BooleanLiteral',
    pattern: /true|false/i,
});
exports.NullLiteral = (0, chevrotain_1.createToken)({
    name: 'NullLiteral',
    pattern: /null/i,
});
exports.DateLiteral = (0, chevrotain_1.createToken)({
    name: 'DateLiteral',
    pattern: /\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?/,
});
// ===== Identifiers =====
exports.Identifier = (0, chevrotain_1.createToken)({
    name: 'Identifier',
    pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});
// ===== Whitespace and Comments =====
exports.WhiteSpace = (0, chevrotain_1.createToken)({
    name: 'WhiteSpace',
    pattern: /\s+/,
    group: chevrotain_1.Lexer.SKIPPED,
});
exports.LineComment = (0, chevrotain_1.createToken)({
    name: 'LineComment',
    pattern: /\/\/[^\n\r]*/,
    group: chevrotain_1.Lexer.SKIPPED,
});
exports.BlockComment = (0, chevrotain_1.createToken)({
    name: 'BlockComment',
    pattern: /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//,
    group: chevrotain_1.Lexer.SKIPPED,
});
// ===== Token Array (order matters!) =====
exports.allTokens = [
    // Whitespace and Comments (first to skip)
    exports.WhiteSpace,
    exports.LineComment,
    exports.BlockComment,
    // Multi-word keywords (before single-word to avoid partial matches)
    exports.OrderBy,
    exports.GroupBy,
    exports.LeftJoin,
    exports.RightJoin,
    exports.FullJoin,
    exports.PointInTime,
    exports.TimeRange,
    // Keywords
    exports.Query,
    exports.From,
    exports.Where,
    exports.And,
    exports.Or,
    exports.Not,
    exports.In,
    exports.Like,
    exports.Between,
    exports.Join,
    exports.On,
    exports.As,
    exports.Select,
    exports.Aggregate,
    exports.Fragment,
    exports.Temporal,
    exports.Geospatial,
    exports.Within,
    exports.Intersects,
    exports.Near,
    exports.Contains,
    exports.Search,
    exports.Match,
    exports.Limit,
    exports.Offset,
    exports.Asc,
    exports.Desc,
    exports.Nulls,
    exports.First,
    exports.Last,
    exports.Exists,
    exports.Any,
    exports.All,
    exports.Distinct,
    // Aggregation Functions
    exports.Count,
    exports.Sum,
    exports.Avg,
    exports.Min,
    exports.Max,
    exports.Histogram,
    exports.Percentiles,
    // Operators (order matters for multi-char operators)
    exports.GreaterThanOrEqual,
    exports.LessThanOrEqual,
    exports.NotEquals,
    exports.Equals,
    exports.GreaterThan,
    exports.LessThan,
    // Symbols
    exports.Arrow,
    exports.LParen,
    exports.RParen,
    exports.LBrace,
    exports.RBrace,
    exports.LBracket,
    exports.RBracket,
    exports.Comma,
    exports.Colon,
    exports.Semicolon,
    exports.Dot,
    exports.At,
    exports.Dollar,
    // Literals (before Identifier to match first)
    exports.DateLiteral,
    exports.BooleanLiteral,
    exports.NullLiteral,
    exports.NumberLiteral,
    exports.StringLiteral,
    // Identifier (last, catches everything else)
    exports.Identifier,
];
// ===== Create Lexer Instance =====
exports.SummitQLLexer = new chevrotain_1.Lexer(exports.allTokens, {
    positionTracking: 'full',
    ensureOptimizations: true,
});
// ===== Export Tokenization Function =====
function tokenize(text) {
    const lexingResult = exports.SummitQLLexer.tokenize(text);
    if (lexingResult.errors.length > 0) {
        throw new Error(`Lexer errors:\n${lexingResult.errors.map((e) => e.message).join('\n')}`);
    }
    return lexingResult;
}
