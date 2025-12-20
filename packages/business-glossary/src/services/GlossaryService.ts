/**
 * Glossary Service
 * Manages business terms, categories, and taxonomy
 */

import {
  GlossaryTerm,
  TermStatus,
  ApprovalStatus,
  GlossaryCategory,
  TermLink,
  TermVersion,
} from '@intelgraph/data-catalog';

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

export class GlossaryService {
  constructor(private store: IGlossaryStore) {}

  /**
   * Create new glossary term
   */
  async createTerm(
    data: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'versionHistory'>
  ): Promise<GlossaryTerm> {
    const now = new Date();

    const term: GlossaryTerm = {
      ...data,
      id: this.generateTermId(data.name),
      version: 1,
      versionHistory: [],
      createdAt: now,
      updatedAt: now,
      createdBy: data.owner,
      updatedBy: data.owner,
      status: TermStatus.DRAFT,
      approvalStatus: ApprovalStatus.PENDING,
      approvedBy: null,
      approvedAt: null,
      childTermIds: [],
      linkedAssets: [],
    };

    return this.store.createTerm(term);
  }

  /**
   * Update glossary term
   */
  async updateTerm(
    id: string,
    updates: Partial<GlossaryTerm>,
    updatedBy: string,
    changeNotes: string = ''
  ): Promise<GlossaryTerm> {
    const existingTerm = await this.store.getTerm(id);
    if (!existingTerm) {
      throw new Error(`Term ${id} not found`);
    }

    // Create version history entry
    const versionEntry: TermVersion = {
      version: existingTerm.version,
      definition: existingTerm.definition,
      changedBy: updatedBy,
      changedAt: new Date(),
      changeNotes,
    };

    const updatedTerm = await this.store.updateTerm(id, {
      ...updates,
      version: existingTerm.version + 1,
      versionHistory: [...existingTerm.versionHistory, versionEntry],
      updatedAt: new Date(),
      updatedBy,
      approvalStatus: ApprovalStatus.PENDING, // Reset approval on changes
    });

    return updatedTerm;
  }

  /**
   * Delete glossary term
   */
  async deleteTerm(id: string): Promise<void> {
    await this.store.deleteTerm(id);
  }

  /**
   * Get term by ID
   */
  async getTerm(id: string): Promise<GlossaryTerm | null> {
    return this.store.getTerm(id);
  }

  /**
   * Search terms
   */
  async searchTerms(query: string): Promise<GlossaryTerm[]> {
    return this.store.searchTerms(query);
  }

  /**
   * Publish term
   */
  async publishTerm(id: string, publishedBy: string): Promise<GlossaryTerm> {
    const term = await this.store.getTerm(id);
    if (!term) {
      throw new Error(`Term ${id} not found`);
    }

    if (term.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new Error('Term must be approved before publishing');
    }

    return this.store.updateTerm(id, {
      status: TermStatus.PUBLISHED,
      updatedBy: publishedBy,
      updatedAt: new Date(),
    });
  }

  /**
   * Deprecate term
   */
  async deprecateTerm(id: string, reason: string, deprecatedBy: string): Promise<GlossaryTerm> {
    return this.store.updateTerm(id, {
      status: TermStatus.DEPRECATED,
      updatedBy: deprecatedBy,
      updatedAt: new Date(),
    });
  }

  /**
   * Add synonym to term
   */
  async addSynonym(termId: string, synonym: string, updatedBy: string): Promise<GlossaryTerm> {
    const term = await this.store.getTerm(termId);
    if (!term) {
      throw new Error(`Term ${termId} not found`);
    }

    const updatedSynonyms = Array.from(new Set([...term.synonyms, synonym]));

    return this.store.updateTerm(termId, {
      synonyms: updatedSynonyms,
      updatedBy,
      updatedAt: new Date(),
    });
  }

  /**
   * Add related term
   */
  async addRelatedTerm(termId: string, relatedTermId: string, updatedBy: string): Promise<GlossaryTerm> {
    const term = await this.store.getTerm(termId);
    if (!term) {
      throw new Error(`Term ${termId} not found`);
    }

    const updatedRelatedTerms = Array.from(new Set([...term.relatedTerms, relatedTermId]));

    return this.store.updateTerm(termId, {
      relatedTerms: updatedRelatedTerms,
      updatedBy,
      updatedAt: new Date(),
    });
  }

  /**
   * Link term to asset
   */
  async linkToAsset(
    termId: string,
    assetId: string,
    linkedBy: string,
    confidence: number = 1.0,
    isAutoLinked: boolean = false
  ): Promise<TermLink> {
    const link: TermLink = {
      termId,
      assetId,
      linkedBy,
      linkedAt: new Date(),
      confidence,
      isAutoLinked,
    };

    // Update term's linked assets
    const term = await this.store.getTerm(termId);
    if (term) {
      await this.store.updateTerm(termId, {
        linkedAssets: [...term.linkedAssets, assetId],
      });
    }

    return this.store.linkTermToAsset(link);
  }

  /**
   * Create category
   */
  async createCategory(
    data: Omit<GlossaryCategory, 'id' | 'childCategoryIds' | 'termCount'>
  ): Promise<GlossaryCategory> {
    const category: GlossaryCategory = {
      ...data,
      id: this.generateCategoryId(data.name),
      childCategoryIds: [],
      termCount: 0,
    };

    return this.store.createCategory(category);
  }

  /**
   * Get category
   */
  async getCategory(id: string): Promise<GlossaryCategory | null> {
    return this.store.getCategory(id);
  }

  /**
   * Generate term ID
   */
  private generateTermId(name: string): string {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `term-${sanitizedName}-${Date.now()}`;
  }

  /**
   * Generate category ID
   */
  private generateCategoryId(name: string): string {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `cat-${sanitizedName}-${Date.now()}`;
  }
}
