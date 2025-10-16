import { Project, SyntaxKind } from 'ts-morph';
import Database from 'better-sqlite3';
const db = new Database('repograph.db');
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS nodes(id TEXT PRIMARY KEY,type TEXT,path TEXT,owner TEXT);
CREATE TABLE IF NOT EXISTS edges(src TEXT,dst TEXT,type TEXT);`);

export async function ingest() {
  const proj = new Project({ tsConfigFilePath: 'tsconfig.json' });
  for (const f of proj.getSourceFiles('**/*.{ts,tsx}')) {
    db.prepare(
      'INSERT OR REPLACE INTO nodes(id,type,path,owner) VALUES(?,?,?,?)',
    ).run(
      f.getFilePath(),
      'file',
      f.getFilePath(),
      inferOwner(f.getFilePath()),
    );
    for (const imp of f.getImportDeclarations()) {
      const to = imp.getModuleSpecifierValue();
      db.prepare('INSERT INTO edges(src,dst,type) VALUES(?,?,?)').run(
        f.getFilePath(),
        to,
        'imports',
      );
    }
    f.forEachDescendant((n) => {
      if (n.getKind() === SyntaxKind.FunctionDeclaration) {
        const id = `${f.getFilePath()}#${(n as any).getName?.() || 'anon'}`;
        db.prepare(
          'INSERT OR REPLACE INTO nodes(id,type,path,owner) VALUES(?,?,?,?)',
        ).run(id, 'fn', f.getFilePath(), inferOwner(f.getFilePath()));
        db.prepare('INSERT INTO edges(src,dst,type) VALUES(?,?,?)').run(
          f.getFilePath(),
          id,
          'declares',
        );
      }
    });
  }
}

function inferOwner(path: string) {
  // naive map; replace with CODEOWNERS map
  if (path.startsWith('server/')) return '@intelgraph/backend';
  if (path.startsWith('client/')) return '@intelgraph/ui';
  return '@intelgraph/ops';
}
