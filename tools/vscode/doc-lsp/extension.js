const path = require('path');
const { workspace, ExtensionContext, window } = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
function activate(context) {
  const serverModule = context.asAbsolutePath(path.join('server.js'));
  const client = new LanguageClient(
    'docLsp',
    'Docs Lint',
    {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: { module: serverModule, transport: TransportKind.ipc },
    },
    {
      documentSelector: [
        { scheme: 'file', language: 'markdown' },
        { scheme: 'file', language: 'mdx' },
      ],
    },
  );
  context.subscriptions.push(client.start());
}
exports.activate = activate;
exports.deactivate = function () {};
