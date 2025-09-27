import { ConsistencyScope, DataFormat, TransformActionType } from './types.js';

export interface RawAction {
  type: TransformActionType;
  params: Record<string, string | number | boolean>;
}

export interface RawFieldRule {
  path: string;
  format: DataFormat | string;
  transforms: RawAction[];
  consistency?: ConsistencyScope | string;
  explain?: string;
}

export interface RawPolicy {
  name: string;
  scope?: ConsistencyScope | string;
  fields: RawFieldRule[];
}

type TokenType =
  | 'identifier'
  | 'string'
  | 'number'
  | 'braceOpen'
  | 'braceClose'
  | 'colon'
  | 'semicolon'
  | 'equals'
  | 'comma'
  | 'dot';

interface Token {
  type: TokenType;
  value?: string;
  line: number;
  column: number;
}

const singleCharTokens: Record<string, TokenType> = {
  '{': 'braceOpen',
  '}': 'braceClose',
  ':': 'colon',
  ';': 'semicolon',
  '=': 'equals',
  ',': 'comma',
  '.': 'dot'
};

export class ParseError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(`${message} (line ${line}, column ${column})`);
  }
}

class TokenStream {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  peek(): Token | undefined {
    return this.tokens[this.index];
  }

  consume<T extends TokenType>(type?: T): Token {
    const token = this.tokens[this.index];
    if (!token) {
      throw new ParseError('Unexpected end of input', this.lastTokenLine(), this.lastTokenColumn());
    }
    if (type && token.type !== type) {
      throw new ParseError(`Expected ${type} but found ${token.type}`, token.line, token.column);
    }
    this.index += 1;
    return token;
  }

  match(type: TokenType): boolean {
    const token = this.peek();
    if (token && token.type === type) {
      this.index += 1;
      return true;
    }
    return false;
  }

  expectIdentifier(expected?: string): string {
    const token = this.consume('identifier');
    if (expected && token.value !== expected) {
      throw new ParseError(`Expected identifier '${expected}' but found '${token.value}'`, token.line, token.column);
    }
    if (!token.value) {
      throw new ParseError('Identifier missing value', token.line, token.column);
    }
    return token.value;
  }

  private lastTokenLine(): number {
    const token = this.tokens[Math.max(0, this.index - 1)];
    return token ? token.line : 1;
  }

  private lastTokenColumn(): number {
    const token = this.tokens[Math.max(0, this.index - 1)];
    return token ? token.column : 1;
  }
}

const identifierStart = /[A-Za-z_]/;
const identifierPart = /[A-Za-z0-9_-]/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let line = 1;
  let column = 1;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (char === '\n') {
      line += 1;
      column = 1;
      i += 1;
      continue;
    }

    if (char === '\r' || char === '\t' || char === ' ') {
      column += 1;
      i += 1;
      continue;
    }

    if (char === '/' && input[i + 1] === '/') {
      while (i < input.length && input[i] !== '\n') {
        i += 1;
      }
      continue;
    }

    if (char === '#') {
      while (i < input.length && input[i] !== '\n') {
        i += 1;
      }
      continue;
    }

    const single = singleCharTokens[char];
    if (single) {
      tokens.push({ type: single, line, column });
      column += 1;
      i += 1;
      continue;
    }

    if (char === '"') {
      let value = '';
      i += 1;
      column += 1;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\') {
          const next = input[i + 1];
          if (next === '"' || next === '\\') {
            value += next;
            i += 2;
            column += 2;
            continue;
          }
        }
        value += input[i];
        i += 1;
        column += 1;
      }
      if (input[i] !== '"') {
        throw new ParseError('Unterminated string literal', line, column);
      }
      i += 1;
      column += 1;
      tokens.push({ type: 'string', value, line, column });
      continue;
    }

    if (char === '-' && /[0-9]/.test(input[i + 1] ?? '')) {
      let value = char;
      let j = i + 1;
      while (j < input.length && /[0-9]/.test(input[j])) {
        value += input[j];
        j += 1;
      }
      tokens.push({ type: 'number', value, line, column });
      column += value.length;
      i = j;
      continue;
    }

    if (/[0-9]/.test(char)) {
      let value = char;
      let j = i + 1;
      while (j < input.length && /[0-9]/.test(input[j])) {
        value += input[j];
        j += 1;
      }
      tokens.push({ type: 'number', value, line, column });
      column += value.length;
      i = j;
      continue;
    }

    if (identifierStart.test(char)) {
      let value = char;
      let j = i + 1;
      while (j < input.length && identifierPart.test(input[j])) {
        value += input[j];
        j += 1;
      }
      tokens.push({ type: 'identifier', value, line, column });
      column += value.length;
      i = j;
      continue;
    }

    throw new ParseError(`Unexpected character '${char}'`, line, column);
  }

  return tokens;
}

function parsePath(stream: TokenStream): string {
  let path = '';
  const first = stream.consume('identifier');
  if (!first.value) {
    throw new ParseError('Missing field path segment', first.line, first.column);
  }
  path += first.value;
  while (stream.match('dot')) {
    const part = stream.consume('identifier');
    if (!part.value) {
      throw new ParseError('Missing field path segment after dot', part.line, part.column);
    }
    path += `.${part.value}`;
  }
  return path;
}

function parseValue(stream: TokenStream): string | number | boolean {
  const next = stream.peek();
  if (!next) {
    throw new ParseError('Unexpected end of input when parsing value', 0, 0);
  }
  if (next.type === 'string') {
    return stream.consume('string').value ?? '';
  }
  if (next.type === 'number') {
    const token = stream.consume('number');
    return Number(token.value);
  }
  if (next.type === 'identifier') {
    const value = stream.consume('identifier').value ?? '';
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }
  throw new ParseError(`Unexpected token type ${next.type} for value`, next.line, next.column);
}

function parseTransform(stream: TokenStream): RawAction {
  const typeToken = stream.consume('identifier');
  const actionType = typeToken.value as TransformActionType | undefined;
  if (!actionType) {
    throw new ParseError('Transform is missing action type', typeToken.line, typeToken.column);
  }

  const params: Record<string, string | number | boolean> = {};
  while (true) {
    const next = stream.peek();
    if (!next) {
      throw new ParseError('Unexpected end of transform', typeToken.line, typeToken.column);
    }
    if (next.type === 'semicolon') {
      stream.consume('semicolon');
      break;
    }
    if (next.type === 'braceClose') {
      throw new ParseError('Expected semicolon after transform parameters', next.line, next.column);
    }
    const keyToken = stream.consume('identifier');
    if (!keyToken.value) {
      throw new ParseError('Expected parameter name in transform', keyToken.line, keyToken.column);
    }
    let value: string | number | boolean = true;
    if (stream.match('equals')) {
      value = parseValue(stream);
    }
    params[keyToken.value] = value;
    if (stream.match('comma')) {
      continue;
    }
  }

  return { type: actionType, params };
}

export function parsePolicy(source: string): RawPolicy {
  const tokens = tokenize(source);
  const stream = new TokenStream(tokens);
  const keyword = stream.expectIdentifier('policy');
  if (!keyword) {
    throw new ParseError('Expected policy declaration', 1, 1);
  }
  const nameToken = stream.consume('identifier');
  const policyName = nameToken.value ?? '';
  if (!policyName) {
    throw new ParseError('Policy name is required', nameToken.line, nameToken.column);
  }
  stream.consume('braceOpen');

  const policy: RawPolicy = {
    name: policyName,
    fields: []
  };

  while (true) {
    const next = stream.peek();
    if (!next) {
      throw new ParseError('Unexpected end of input inside policy', 0, 0);
    }
    if (next.type === 'braceClose') {
      stream.consume('braceClose');
      break;
    }
    if (next.type === 'identifier') {
      const identifier = next.value;
      if (identifier === 'scope') {
        stream.consume('identifier');
        const scopeToken = stream.consume('identifier');
        policy.scope = (scopeToken.value as ConsistencyScope | string | undefined) ?? 'session';
        if (!stream.match('semicolon')) {
          throw new ParseError('Expected semicolon after scope declaration', scopeToken.line, scopeToken.column);
        }
        continue;
      }
      if (identifier === 'field') {
        stream.consume('identifier');
        const path = parsePath(stream);
        stream.consume('colon');
        const formatToken = stream.consume('identifier');
        const field: RawFieldRule = {
          path,
          format: (formatToken.value as DataFormat | string | undefined) ?? 'string',
          transforms: []
        };
        stream.consume('braceOpen');

        while (true) {
          const inner = stream.peek();
          if (!inner) {
            throw new ParseError('Unexpected end of field block', 0, 0);
          }
          if (inner.type === 'braceClose') {
            stream.consume('braceClose');
            break;
          }
          if (inner.type === 'identifier') {
            const keywordToken = inner.value;
            if (keywordToken === 'transform') {
              stream.consume('identifier');
              field.transforms.push(parseTransform(stream));
              continue;
            }
            if (keywordToken === 'consistency') {
              stream.consume('identifier');
              const scope = stream.consume('identifier');
              field.consistency = (scope.value as ConsistencyScope | string | undefined) ?? undefined;
              if (!stream.match('semicolon')) {
                throw new ParseError('Expected semicolon after consistency declaration', scope.line, scope.column);
              }
              continue;
            }
            if (keywordToken === 'explain') {
              stream.consume('identifier');
              const explanationToken = stream.consume('string');
              field.explain = explanationToken.value ?? '';
              if (!stream.match('semicolon')) {
                throw new ParseError('Expected semicolon after explain text', explanationToken.line, explanationToken.column);
              }
              continue;
            }
          }
          throw new ParseError(`Unexpected token ${inner.type} in field block`, inner.line, inner.column);
        }

        policy.fields.push(field);
        continue;
      }
    }
    throw new ParseError('Unexpected token in policy body', next.line, next.column);
  }

  return policy;
}
