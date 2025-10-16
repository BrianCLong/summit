const {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
} = require('vscode-languageserver/node');
const matter = require('gray-matter');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const fs = require('fs');
const schema = JSON.parse(
  fs.readFileSync('docs/_meta/frontmatter.schema.json', 'utf8'),
);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const conn = createConnection();
const docs = new TextDocuments();
function lint(text) {
  const res = [];
  const g = matter(text);
  if (!validate(g.data || {})) {
    res.push({
      message: ajv.errorsText(validate.errors),
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
    });
  }
  if (!/##\s*See also/i.test(g.content || ''))
    res.push({
      message: 'Missing "See also" section',
      severity: 2,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
    });
  return res;
}
conn.onInitialize(() => ({ capabilities: { textDocumentSync: 1 } }));
docs.onDidChangeContent((e) => {
  conn.sendDiagnostics({
    uri: e.document.uri,
    diagnostics: lint(e.document.getText()),
  });
});
docs.listen(conn);
conn.listen();
