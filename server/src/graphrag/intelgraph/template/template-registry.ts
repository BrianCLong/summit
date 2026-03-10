export type IntelGraphTemplate = {
  id: string
  version: string
  category: string
  title: string
  description: string
  parameters: Record<string, unknown>
  scope: { required: string[] }
  returns: Record<string, unknown>
  provenance: { requiredFields: string[] }
  risk: { abusePotential: string; notes: string }
  budgets: { p95Ms: number; maxDbHits: number; maxRows: number }
  cypher: { entrypoint: string }
  evidence: { idPattern: string }
}

export class TemplateRegistry {
  private templates = new Map<string, IntelGraphTemplate>();

  register(template: IntelGraphTemplate) {
    this.templates.set(template.id, template);
  }

  get(id: string): IntelGraphTemplate | undefined {
    return this.templates.get(id);
  }

  list(): IntelGraphTemplate[] {
    return Array.from(this.templates.values());
  }
}
