export type Template = {
  id: string;
  version: string;
  text: string;
  checksum: string;
};
export const TemplateRegistry = {
  get(id: string): Template | null {
    return {
      id,
      version: 'v1',
      text: 'Hello, {{name}}',
      checksum: 'sha256:deadbeef',
    };
  },
  render(t: Template, vars: Record<string, any>) {
    return t.text.replace(/\{\{(.*?)\}\}/g, (_: any, k: string) =>
      String(vars[k.trim()] ?? ''),
    );
  },
};
