const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('intelgraph.docs.new', async () => {
      const type = await vscode.window.showQuickPick(
        ['how-to', 'tutorial', 'concept'],
        { placeHolder: 'Doc type' },
      );
      const title = await vscode.window.showInputBox({ prompt: 'Page title' });
      if (!type || !title) return;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const tplPath = path.join(
        vscode.workspace.rootPath,
        'docs/_templates',
        `${type}.md`,
      );
      const tpl = fs
        .readFileSync(tplPath, 'utf8')
        .replace('<Task-oriented title>', title)
        .replace('<End-to-end tutorial>', title)
        .replace('<Concept name>', title);
      const out = path.join(
        vscode.workspace.rootPath,
        'docs',
        type === 'concept' ? 'concepts' : type,
        `${slug}.md`,
      );
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, tpl);
      const doc = await vscode.workspace.openTextDocument(out);
      vscode.window.showTextDocument(doc);
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('intelgraph.docs.search', async () => {
      vscode.env.openExternal(
        vscode.Uri.parse('https://docs.intelgraph.example/?q='),
      );
    }),
  );
}
exports.activate = activate;
function deactivate() {}
exports.deactivate = deactivate;
