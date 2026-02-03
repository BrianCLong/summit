/**
 * Vanilla JS helper to mount a sandboxed MCP App iframe
 */
export function mountMcpApp(
  container: HTMLElement,
  template: string,
  origin: string = '*'
): HTMLIFrameElement {
  const iframe = document.createElement('iframe');

  // Security best practices: sandbox and restricted permissions
  iframe.sandbox.add('allow-scripts');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';

  container.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(template);
    doc.close();
  }

  return iframe;
}
