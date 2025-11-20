/**
 * Summit Query Language Parser
 *
 * Parses tokenized SummitQL queries into an Abstract Syntax Tree (AST)
 */

import { CstParser, IToken } from 'chevrotain';
import * as T from './lexer';
import type { Query, FilterExpression, FieldSelection } from '../types';

export class SummitQLParser extends CstParser {
  constructor() {
    super(T.allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full',
    });

    this.performSelfAnalysis();
  }

  // ===== Entry Point =====

  public query = this.RULE('query', () => {
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

  private resourceClause = this.RULE('resourceClause', () => {
    this.CONSUME(T.From);
    this.CONSUME(T.Colon);
    this.CONSUME(T.Identifier);
  });

  // ===== Field Selection =====

  private fieldSelection = this.RULE('fieldSelection', () => {
    this.CONSUME(T.Select);
    this.CONSUME(T.Colon);
    this.CONSUME(T.LBracket);
    this.SUBRULE(this.fieldList);
    this.CONSUME(T.RBracket);
  });

  private fieldList = this.RULE('fieldList', () => {
    this.SUBRULE(this.field);
    this.MANY(() => {
      this.CONSUME(T.Comma);
      this.SUBRULE1(this.field);
    });
  });

  private field = this.RULE('field', () => {
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

  private whereClause = this.RULE('whereClause', () => {
    this.CONSUME(T.Where);
    this.CONSUME(T.Colon);
    this.SUBRULE(this.filterExpression);
  });

  private filterExpression = this.RULE('filterExpression', () => {
    this.SUBRULE(this.logicalOrExpression);
  });

  private logicalOrExpression = this.RULE('logicalOrExpression', () => {
    this.SUBRULE(this.logicalAndExpression);
    this.MANY(() => {
      this.CONSUME(T.Or);
      this.SUBRULE1(this.logicalAndExpression);
    });
  });

  private logicalAndExpression = this.RULE('logicalAndExpression', () => {
    this.SUBRULE(this.logicalNotExpression);
    this.MANY(() => {
      this.CONSUME(T.And);
      this.SUBRULE1(this.logicalNotExpression);
    });
  });

  private logicalNotExpression = this.RULE('logicalNotExpression', () => {
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

  private primaryFilterExpression = this.RULE('primaryFilterExpression', () => {
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

  private comparisonExpression = this.RULE('comparisonExpression', () => {
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

  private fullTextSearch = this.RULE('fullTextSearch', () => {
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

  private geoFilterExpression = this.RULE('geoFilterExpression', () => {
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

  private existsExpression = this.RULE('existsExpression', () => {
    this.CONSUME(T.Exists);
    this.CONSUME(T.LParen);
    this.CONSUME(T.Identifier);
    this.CONSUME(T.RParen);
  });

  // ===== Join Clause =====

  private joinClause = this.RULE('joinClause', () => {
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

  private joinCondition = this.RULE('joinCondition', () => {
    this.CONSUME(T.Identifier); // left field
    this.OR([
      { ALT: () => this.CONSUME(T.Equals) },
      { ALT: () => this.CONSUME(T.NotEquals) },
    ]);
    this.CONSUME1(T.Identifier); // right field
  });

  // ===== Order By Clause =====

  private orderByClause = this.RULE('orderByClause', () => {
    this.CONSUME(T.OrderBy);
    this.CONSUME(T.Colon);
    this.CONSUME(T.LBracket);
    this.SUBRULE(this.sortList);
    this.CONSUME(T.RBracket);
  });

  private sortList = this.RULE('sortList', () => {
    this.SUBRULE(this.sortClause);
    this.MANY(() => {
      this.CONSUME(T.Comma);
      this.SUBRULE1(this.sortClause);
    });
  });

  private sortClause = this.RULE('sortClause', () => {
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

  private limitClause = this.RULE('limitClause', () => {
    this.CONSUME(T.Limit);
    this.CONSUME(T.Colon);
    this.CONSUME(T.NumberLiteral);
  });

  private offsetClause = this.RULE('offsetClause', () => {
    this.CONSUME(T.Offset);
    this.CONSUME(T.Colon);
    this.CONSUME(T.NumberLiteral);
  });

  // ===== Aggregate Clause =====

  private aggregateClause = this.RULE('aggregateClause', () => {
    this.CONSUME(T.Aggregate);
    this.CONSUME(T.Colon);
    this.CONSUME(T.LBracket);
    this.SUBRULE(this.aggregationList);
    this.CONSUME(T.RBracket);
  });

  private aggregationList = this.RULE('aggregationList', () => {
    this.SUBRULE(this.aggregation);
    this.MANY(() => {
      this.CONSUME(T.Comma);
      this.SUBRULE1(this.aggregation);
    });
  });

  private aggregation = this.RULE('aggregation', () => {
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

  private temporalClause = this.RULE('temporalClause', () => {
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

  private geospatialClause = this.RULE('geospatialClause', () => {
    this.CONSUME(T.Geospatial);
    this.CONSUME(T.Colon);
    this.CONSUME(T.LBrace);
    this.SUBRULE(this.objectLiteral);
    this.CONSUME(T.RBrace);
  });

  // ===== Values and Literals =====

  private value = this.RULE('value', () => {
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

  private arrayLiteral = this.RULE('arrayLiteral', () => {
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

  private objectLiteral = this.RULE('objectLiteral', () => {
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

  private objectProperty = this.RULE('objectProperty', () => {
    this.OR([
      { ALT: () => this.CONSUME(T.Identifier) },
      { ALT: () => this.CONSUME(T.StringLiteral) },
    ]);
    this.CONSUME(T.Colon);
    this.SUBRULE(this.value);
  });

  private argumentList = this.RULE('argumentList', () => {
    this.SUBRULE(this.argument);
    this.MANY(() => {
      this.CONSUME(T.Comma);
      this.SUBRULE1(this.argument);
    });
  });

  private argument = this.RULE('argument', () => {
    this.CONSUME(T.Identifier);
    this.CONSUME(T.Colon);
    this.SUBRULE(this.value);
  });
}

// ===== Create Parser Instance =====

export const parserInstance = new SummitQLParser();

// ===== Export Parse Function =====

export function parse(tokens: IToken[]) {
  parserInstance.input = tokens;
  const cst = parserInstance.query();

  if (parserInstance.errors.length > 0) {
    throw new Error(
      `Parser errors:\n${parserInstance.errors.map((e) => e.message).join('\n')}`
    );
  }

  return cst;
}
