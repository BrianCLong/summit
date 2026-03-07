import { GlossaryTerm, GlossaryCategory, TermLink } from "@intelgraph/data-catalog";

export interface IGlossaryStore {
  getTerm(id: string): Promise<GlossaryTerm | null>;
  createTerm(term: GlossaryTerm): Promise<GlossaryTerm>;
  updateTerm(id: string, term: Partial<GlossaryTerm>): Promise<GlossaryTerm>;
  deleteTerm(id: string): Promise<void>;
  searchTerms(query: string): Promise<GlossaryTerm[]>;
  getCategory(id: string): Promise<GlossaryCategory | null>;
  createCategory(category: GlossaryCategory): Promise<GlossaryCategory>;
  linkTermToAsset(link: TermLink): Promise<TermLink>;
}
