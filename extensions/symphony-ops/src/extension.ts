import * as vscode from 'vscode';

export function activate(ctx: vscode.ExtensionContext) {
  const BASE = process.env.SYMPHONY_BASE || 'http://127.0.0.1:8787';

  async function post(path: string, body: any) {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }

  ctx.subscriptions.push(
    vscode.commands.registerCommand('symphony.execute', async () => {
      const ed = vscode.window.activeTextEditor;
      const input =
        ed?.document.getText(ed.selection) || ed?.document.getText() || '';
      const j = await post('/route/execute', {
        task: 'qa',
        loa: 1,
        input,
        stream: true,
      });
      vscode.window.showInformationMessage(
        `Audit ${j.audit_id} • ${j.latency_ms}ms`,
      );
    }),
    vscode.commands.registerCommand('symphony.explain', async () => {
      const j = await post('/route/plan', { task: 'qa', loa: 1 });
      vscode.window.showInformationMessage(
        `Decision: ${j.decision?.primary?.model || 'n/a'}`,
      );
    }),
  );
}
