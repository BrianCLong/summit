import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('ultraAgent.run', async () => {
		const request = await vscode.window.showInputBox({
			placeHolder: 'Describe what you want to build...'
		});

		if (request) {
			vscode.window.showInformationMessage(`Ultra Agent running: ${request}`);

			// Here we would spawn the python process or call the API
			// const terminal = vscode.window.createTerminal("Ultra Agent");
			// terminal.show();
			// terminal.sendText(`python -m agent.main "${request}"`);
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
