import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';
import type { RuleFix, RuleFixer } from '@typescript-eslint/utils/ts-eslint';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/summit/srpl/tree/main/docs/rules/${name}.md`,
);

const SUSPICIOUS_MEMBER_CALLEES = new Set(['query', 'execute', 'raw']);
const SUSPICIOUS_IDENTIFIERS = new Set(['query', 'sql', 'execute']);
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isSuspiciousCall(node: TSESTree.CallExpression): boolean {
  const { callee } = node;
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') {
    return SUSPICIOUS_MEMBER_CALLEES.has(callee.property.name);
  }
  if (callee.type === 'Identifier') {
    return SUSPICIOUS_IDENTIFIERS.has(callee.name);
  }
  return false;
}

interface EntityByIdAnalysis {
  readonly type: 'entityById';
  readonly table: string;
  readonly column: string;
  readonly columns: ReadonlyArray<string> | undefined;
  readonly expression: TSESTree.Expression;
}

type Analysis = EntityByIdAnalysis | null;

const SELECT_WHERE_PATTERN = /select\s+([^]*?)\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\s+where\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*$/i;

function cleanIdentifier(value: string): string | null {
  const trimmed = value.trim();
  if (!IDENTIFIER_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function analyzeTemplate(node: TSESTree.TemplateLiteral): Analysis {
  if (node.expressions.length !== 1 || node.quasis.length !== 2) {
    return null;
  }
  const [head, tail] = node.quasis;
  if (!head || !tail) {
    return null;
  }
  if ((tail.value.cooked ?? tail.value.raw ?? '').trim().length > 0) {
    return null;
  }
  const cooked = head.value.cooked ?? head.value.raw ?? '';
  const match = cooked.match(SELECT_WHERE_PATTERN);
  if (!match) {
    return null;
  }
  const [, columnsChunk, rawTable, rawColumn] = match;
  const table = cleanIdentifier(rawTable);
  const column = cleanIdentifier(rawColumn);
  if (!table || !column) {
    return null;
  }
  const rawColumns = columnsChunk.trim();
  let columns: string[] | undefined;
  if (rawColumns !== '*' && rawColumns.length > 0) {
    const parsed = rawColumns.split(',').map((part) => part.trim()).filter(Boolean);
    if (parsed.length === 0) {
      return null;
    }
    if (parsed.some((value) => !IDENTIFIER_PATTERN.test(value))) {
      return null;
    }
    columns = parsed;
  }
  return {
    type: 'entityById',
    table,
    column,
    columns,
    expression: node.expressions[0]!,
  };
}

function toLiteral(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

type CreateRuleContext = Readonly<Parameters<ReturnType<typeof createRule>['create']>[0]>;

function ensureImport(context: CreateRuleContext, fixer: RuleFixer, macro: string): RuleFix | null {
  const sourceCode = context.sourceCode;
  const program = sourceCode.ast;
  const importDeclaration = program.body.find(
    (statement): statement is TSESTree.ImportDeclaration =>
      statement.type === 'ImportDeclaration' && statement.source.value === '@summit/srpl',
  );
  if (!importDeclaration) {
    return fixer.insertTextBeforeRange([0, 0], `import { ${macro} } from '@summit/srpl';\n`);
  }
  const hasSpecifier = importDeclaration.specifiers.some(
    (specifier) => specifier.type === 'ImportSpecifier' && specifier.imported.type === 'Identifier' && specifier.imported.name === macro,
  );
  if (hasSpecifier) {
    return null;
  }
  const importSpecifiers = importDeclaration.specifiers.filter(
    (specifier): specifier is TSESTree.ImportSpecifier => specifier.type === 'ImportSpecifier',
  );
  if (importSpecifiers.length === 0) {
    return fixer.insertTextBefore(importDeclaration.source, `{ ${macro} } `);
  }
  const lastSpecifier = importSpecifiers[importSpecifiers.length - 1]!;
  return fixer.insertTextAfter(lastSpecifier, `, ${macro}`);
}

function buildEntityByIdFix(context: CreateRuleContext, node: TSESTree.TemplateLiteral, analysis: EntityByIdAnalysis) {
  return (fixer: RuleFixer): RuleFix | RuleFix[] | null => {
    const sourceCode = context.sourceCode;
    const exprText = sourceCode.getText(analysis.expression);
    const parts = [`table: ${toLiteral(analysis.table)}`];
    if (analysis.columns && analysis.columns.length > 0) {
      const columnList = analysis.columns.map((column) => toLiteral(column)).join(', ');
      parts.push(`columns: [${columnList}]`);
    }
    if (analysis.column !== 'id') {
      parts.push(`idColumn: ${toLiteral(analysis.column)}`);
    }
    parts.push(`id: ${exprText}`);
    const replacement = `entityById({ ${parts.join(', ')} })`;
    const fixes: RuleFix[] = [fixer.replaceText(node, replacement)];
    const importFix = ensureImport(context, fixer, 'entityById');
    if (importFix) {
      fixes.push(importFix);
    }
    return fixes;
  };
}

export const noUnsafeRetrievalRule = createRule<[], 'unsafeQuery'>({
  name: 'no-unsafe-retrieval',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow unsafe SQL template literals in favor of SRPL macros.',
    },
    schema: [],
    messages: {
      unsafeQuery: 'Use the SRPL macro {{macro}} instead of raw SQL templates.',
    },
    hasSuggestions: false,
    fixable: 'code',
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (!isSuspiciousCall(node)) {
          return;
        }
        const [firstArgument] = node.arguments;
        if (!firstArgument || firstArgument.type !== 'TemplateLiteral') {
          return;
        }
        if (firstArgument.expressions.length === 0) {
          return;
        }
        const analysis = analyzeTemplate(firstArgument);
        context.report({
          node: firstArgument,
          messageId: 'unsafeQuery',
          data: { macro: analysis?.type === 'entityById' ? 'entityById' : 'an SRPL macro' },
          fix: analysis ? buildEntityByIdFix(context, firstArgument, analysis) : null,
        });
      },
    };
  },
});
