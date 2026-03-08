"use strict";
/**
 * Summit Query Language Parser
 *
 * Parses tokenized SummitQL queries into an Abstract Syntax Tree (AST)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parserInstance = exports.SummitQLParser = void 0;
exports.parse = parse;
const chevrotain_1 = require("chevrotain");
const T = __importStar(require("./lexer.js"));
class SummitQLParser extends chevrotain_1.CstParser {
    constructor() {
        super(T.allTokens, {
            recoveryEnabled: true,
            nodeLocationTracking: 'full',
        });
        this.performSelfAnalysis();
    }
    // ===== Entry Point =====
    query = this.RULE('query', () => {
        this.CONSUME(T.Query);
        this.CONSUME(T.LBrace);
        // Resource selection
        this.SUBRULE(this.resourceClause);
        // Optional clauses
        this.OPTION(() => this.SUBRULE(this.fieldSelection));
        this.OPTION1(() => this.SUBRULE(this.whereClause));
        this.OPTION2(() => this.SUBRULE(this.joinClause));
        this.OPTION3(() => this.SUBRULE(this.orderByClause));
        this.OPTION4(() => this.SUBRULE(this.limitClause));
        this.OPTION5(() => this.SUBRULE(this.offsetClause));
        this.OPTION6(() => this.SUBRULE(this.aggregateClause));
        this.OPTION7(() => this.SUBRULE(this.temporalClause));
        this.OPTION8(() => this.SUBRULE(this.geospatialClause));
        this.CONSUME(T.RBrace);
    });
    // ===== Resource Clause =====
    resourceClause = this.RULE('resourceClause', () => {
        this.CONSUME(T.From);
        this.CONSUME(T.Colon);
        this.CONSUME(T.Identifier);
    });
    // ===== Field Selection =====
    fieldSelection = this.RULE('fieldSelection', () => {
        this.CONSUME(T.Select);
        this.CONSUME(T.Colon);
        this.CONSUME(T.LBracket);
        this.SUBRULE(this.fieldList);
        this.CONSUME(T.RBracket);
    });
    fieldList = this.RULE('fieldList', () => {
        this.SUBRULE(this.field);
        this.MANY(() => {
            this.CONSUME(T.Comma);
            this.SUBRULE1(this.field);
        });
    });
    field = this.RULE('field', () => {
        this.CONSUME(T.Identifier);
        // Optional alias
        this.OPTION(() => {
            this.CONSUME(T.As);
            this.CONSUME1(T.Identifier);
        });
        // Optional nested fields
        this.OPTION1(() => {
            this.CONSUME(T.LBrace);
            this.SUBRULE(this.fieldList);
            this.CONSUME(T.RBrace);
        });
        // Optional arguments
        this.OPTION2(() => {
            this.CONSUME(T.LParen);
            this.SUBRULE(this.argumentList);
            this.CONSUME(T.RParen);
        });
    });
    // ===== Where Clause =====
    whereClause = this.RULE('whereClause', () => {
        this.CONSUME(T.Where);
        this.CONSUME(T.Colon);
        this.SUBRULE(this.filterExpression);
    });
    filterExpression = this.RULE('filterExpression', () => {
        this.SUBRULE(this.logicalOrExpression);
    });
    logicalOrExpression = this.RULE('logicalOrExpression', () => {
        this.SUBRULE(this.logicalAndExpression);
        this.MANY(() => {
            this.CONSUME(T.Or);
            this.SUBRULE1(this.logicalAndExpression);
        });
    });
    logicalAndExpression = this.RULE('logicalAndExpression', () => {
        this.SUBRULE(this.logicalNotExpression);
        this.MANY(() => {
            this.CONSUME(T.And);
            this.SUBRULE1(this.logicalNotExpression);
        });
    });
    logicalNotExpression = this.RULE('logicalNotExpression', () => {
        this.OR([
            {
                ALT: () => {
                    this.CONSUME(T.Not);
                    this.SUBRULE(this.primaryFilterExpression);
                },
            },
            {
                ALT: () => {
                    this.SUBRULE1(this.primaryFilterExpression);
                },
            },
        ]);
    });
    primaryFilterExpression = this.RULE('primaryFilterExpression', () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.comparisonExpression) },
            { ALT: () => this.SUBRULE(this.fullTextSearch) },
            { ALT: () => this.SUBRULE(this.geoFilterExpression) },
            { ALT: () => this.SUBRULE(this.existsExpression) },
            {
                ALT: () => {
                    this.CONSUME(T.LParen);
                    this.SUBRULE(this.filterExpression);
                    this.CONSUME(T.RParen);
                },
            },
        ]);
    });
    comparisonExpression = this.RULE('comparisonExpression', () => {
        this.CONSUME(T.Identifier); // field
        this.OR([
            { ALT: () => this.CONSUME(T.Equals) },
            { ALT: () => this.CONSUME(T.NotEquals) },
            { ALT: () => this.CONSUME(T.GreaterThan) },
            { ALT: () => this.CONSUME(T.GreaterThanOrEqual) },
            { ALT: () => this.CONSUME(T.LessThan) },
            { ALT: () => this.CONSUME(T.LessThanOrEqual) },
            { ALT: () => this.CONSUME(T.Like) },
            { ALT: () => this.CONSUME(T.In) },
            { ALT: () => this.CONSUME(T.Contains) },
        ]);
        this.SUBRULE(this.value);
    });
    fullTextSearch = this.RULE('fullTextSearch', () => {
        this.CONSUME(T.Search);
        this.CONSUME(T.LParen);
        this.CONSUME(T.Identifier); // fields
        this.CONSUME(T.Comma);
        this.CONSUME(T.StringLiteral); // query
        this.OPTION(() => {
            this.CONSUME1(T.Comma);
            this.SUBRULE(this.objectLiteral); // options
        });
        this.CONSUME(T.RParen);
    });
    geoFilterExpression = this.RULE('geoFilterExpression', () => {
        this.OR([
            { ALT: () => this.CONSUME(T.Within) },
            { ALT: () => this.CONSUME(T.Intersects) },
            { ALT: () => this.CONSUME(T.Near) },
        ]);
        this.CONSUME(T.LParen);
        this.CONSUME(T.Identifier); // field
        this.CONSUME(T.Comma);
        this.SUBRULE(this.value); // geometry
        this.OPTION(() => {
            this.CONSUME1(T.Comma);
            this.SUBRULE(this.objectLiteral); // options
        });
        this.CONSUME(T.RParen);
    });
    existsExpression = this.RULE('existsExpression', () => {
        this.CONSUME(T.Exists);
        this.CONSUME(T.LParen);
        this.CONSUME(T.Identifier);
        this.CONSUME(T.RParen);
    });
    // ===== Join Clause =====
    joinClause = this.RULE('joinClause', () => {
        this.OR([
            { ALT: () => this.CONSUME(T.Join) },
            { ALT: () => this.CONSUME(T.LeftJoin) },
            { ALT: () => this.CONSUME(T.RightJoin) },
            { ALT: () => this.CONSUME(T.FullJoin) },
        ]);
        this.CONSUME(T.Colon);
        this.CONSUME(T.LBrace);
        // Resource
        this.CONSUME(T.From);
        this.CONSUME1(T.Colon);
        this.CONSUME(T.Identifier);
        // On condition
        this.CONSUME(T.On);
        this.CONSUME2(T.Colon);
        this.SUBRULE(this.joinCondition);
        // Optional alias
        this.OPTION(() => {
            this.CONSUME(T.As);
            this.CONSUME3(T.Colon);
            this.CONSUME1(T.Identifier);
        });
        this.CONSUME(T.RBrace);
    });
    joinCondition = this.RULE('joinCondition', () => {
        this.CONSUME(T.Identifier); // left field
        this.OR([
            { ALT: () => this.CONSUME(T.Equals) },
            { ALT: () => this.CONSUME(T.NotEquals) },
        ]);
        this.CONSUME1(T.Identifier); // right field
    });
    // ===== Order By Clause =====
    orderByClause = this.RULE('orderByClause', () => {
        this.CONSUME(T.OrderBy);
        this.CONSUME(T.Colon);
        this.CONSUME(T.LBracket);
        this.SUBRULE(this.sortList);
        this.CONSUME(T.RBracket);
    });
    sortList = this.RULE('sortList', () => {
        this.SUBRULE(this.sortClause);
        this.MANY(() => {
            this.CONSUME(T.Comma);
            this.SUBRULE1(this.sortClause);
        });
    });
    sortClause = this.RULE('sortClause', () => {
        this.CONSUME(T.Identifier);
        this.OR([
            { ALT: () => this.CONSUME(T.Asc) },
            { ALT: () => this.CONSUME(T.Desc) },
        ]);
        this.OPTION(() => {
            this.CONSUME(T.Nulls);
            this.OR1([
                { ALT: () => this.CONSUME(T.First) },
                { ALT: () => this.CONSUME(T.Last) },
            ]);
        });
    });
    // ===== Limit and Offset =====
    limitClause = this.RULE('limitClause', () => {
        this.CONSUME(T.Limit);
        this.CONSUME(T.Colon);
        this.CONSUME(T.NumberLiteral);
    });
    offsetClause = this.RULE('offsetClause', () => {
        this.CONSUME(T.Offset);
        this.CONSUME(T.Colon);
        this.CONSUME(T.NumberLiteral);
    });
    // ===== Aggregate Clause =====
    aggregateClause = this.RULE('aggregateClause', () => {
        this.CONSUME(T.Aggregate);
        this.CONSUME(T.Colon);
        this.CONSUME(T.LBracket);
        this.SUBRULE(this.aggregationList);
        this.CONSUME(T.RBracket);
    });
    aggregationList = this.RULE('aggregationList', () => {
        this.SUBRULE(this.aggregation);
        this.MANY(() => {
            this.CONSUME(T.Comma);
            this.SUBRULE1(this.aggregation);
        });
    });
    aggregation = this.RULE('aggregation', () => {
        this.OR([
            { ALT: () => this.CONSUME(T.Count) },
            { ALT: () => this.CONSUME(T.Sum) },
            { ALT: () => this.CONSUME(T.Avg) },
            { ALT: () => this.CONSUME(T.Min) },
            { ALT: () => this.CONSUME(T.Max) },
            { ALT: () => this.CONSUME(T.Histogram) },
            { ALT: () => this.CONSUME(T.Percentiles) },
        ]);
        this.CONSUME(T.LParen);
        this.OPTION(() => {
            this.CONSUME(T.Identifier);
        });
        this.CONSUME(T.RParen);
        this.OPTION1(() => {
            this.CONSUME(T.As);
            this.CONSUME1(T.Identifier);
        });
    });
    // ===== Temporal Clause =====
    temporalClause = this.RULE('temporalClause', () => {
        this.CONSUME(T.Temporal);
        this.CONSUME(T.Colon);
        this.CONSUME(T.LBrace);
        this.OR([
            { ALT: () => this.CONSUME(T.PointInTime) },
            { ALT: () => this.CONSUME(T.TimeRange) },
        ]);
        this.CONSUME1(T.Colon);
        this.SUBRULE(this.value);
        this.CONSUME(T.RBrace);
    });
    // ===== Geospatial Clause =====
    geospatialClause = this.RULE('geospatialClause', () => {
        this.CONSUME(T.Geospatial);
        this.CONSUME(T.Colon);
        this.CONSUME(T.LBrace);
        this.SUBRULE(this.objectLiteral);
        this.CONSUME(T.RBrace);
    });
    // ===== Values and Literals =====
    value = this.RULE('value', () => {
        this.OR([
            { ALT: () => this.CONSUME(T.StringLiteral) },
            { ALT: () => this.CONSUME(T.NumberLiteral) },
            { ALT: () => this.CONSUME(T.BooleanLiteral) },
            { ALT: () => this.CONSUME(T.NullLiteral) },
            { ALT: () => this.CONSUME(T.DateLiteral) },
            { ALT: () => this.SUBRULE(this.arrayLiteral) },
            { ALT: () => this.SUBRULE(this.objectLiteral) },
        ]);
    });
    arrayLiteral = this.RULE('arrayLiteral', () => {
        this.CONSUME(T.LBracket);
        this.OPTION(() => {
            this.SUBRULE(this.value);
            this.MANY(() => {
                this.CONSUME(T.Comma);
                this.SUBRULE1(this.value);
            });
        });
        this.CONSUME(T.RBracket);
    });
    objectLiteral = this.RULE('objectLiteral', () => {
        this.CONSUME(T.LBrace);
        this.OPTION(() => {
            this.SUBRULE(this.objectProperty);
            this.MANY(() => {
                this.CONSUME(T.Comma);
                this.SUBRULE1(this.objectProperty);
            });
        });
        this.CONSUME(T.RBrace);
    });
    objectProperty = this.RULE('objectProperty', () => {
        this.OR([
            { ALT: () => this.CONSUME(T.Identifier) },
            { ALT: () => this.CONSUME(T.StringLiteral) },
        ]);
        this.CONSUME(T.Colon);
        this.SUBRULE(this.value);
    });
    argumentList = this.RULE('argumentList', () => {
        this.SUBRULE(this.argument);
        this.MANY(() => {
            this.CONSUME(T.Comma);
            this.SUBRULE1(this.argument);
        });
    });
    argument = this.RULE('argument', () => {
        this.CONSUME(T.Identifier);
        this.CONSUME(T.Colon);
        this.SUBRULE(this.value);
    });
}
exports.SummitQLParser = SummitQLParser;
// ===== Create Parser Instance =====
exports.parserInstance = new SummitQLParser();
// ===== Export Parse Function =====
function parse(tokens) {
    exports.parserInstance.input = tokens;
    const cst = exports.parserInstance.query();
    if (exports.parserInstance.errors.length > 0) {
        throw new Error(`Parser errors:\n${exports.parserInstance.errors.map((e) => e.message).join('\n')}`);
    }
    return cst;
}
