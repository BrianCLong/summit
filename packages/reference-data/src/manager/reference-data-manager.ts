/**
 * Reference Data Manager
 * Manages code lists, lookup tables, and standard nomenclature
 */

import { v4 as uuidv4 } from 'uuid';

export interface CodeList {
  id: string;
  name: string;
  description: string;
  domain: string;
  codes: Code[];
  version: number;
  status: 'draft' | 'active' | 'deprecated';
  validFrom?: Date;
  validTo?: Date;
  metadata: CodeListMetadata;
}

export interface Code {
  code: string;
  value: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  parentCode?: string;
  attributes: Record<string, unknown>;
}

export interface CodeListMetadata {
  owner: string;
  steward: string;
  classification: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface LookupTable {
  id: string;
  name: string;
  description: string;
  sourceFields: string[];
  targetFields: string[];
  mappings: LookupMapping[];
  version: number;
  cacheEnabled: boolean;
}

export interface LookupMapping {
  sourceValues: Record<string, unknown>;
  targetValues: Record<string, unknown>;
  confidence: number;
  active: boolean;
}

export class ReferenceDataManager {
  private codeLists: Map<string, CodeList>;
  private lookupTables: Map<string, LookupTable>;
  private codeIndex: Map<string, Map<string, Code>>;

  constructor() {
    this.codeLists = new Map();
    this.lookupTables = new Map();
    this.codeIndex = new Map();
  }

  /**
   * Create new code list
   */
  async createCodeList(
    name: string,
    description: string,
    domain: string,
    codes: Omit<Code, 'sortOrder' | 'active' | 'attributes'>[],
    owner: string
  ): Promise<CodeList> {
    const codeList: CodeList = {
      id: uuidv4(),
      name,
      description,
      domain,
      codes: codes.map((c, i) => ({
        ...c,
        sortOrder: i,
        active: true,
        attributes: {}
      })),
      version: 1,
      status: 'active',
      metadata: {
        owner,
        steward: owner,
        classification: 'standard',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: owner,
        updatedBy: owner
      }
    };

    this.codeLists.set(codeList.id, codeList);
    this.indexCodes(codeList);

    return codeList;
  }

  /**
   * Get code list by ID
   */
  async getCodeList(id: string): Promise<CodeList | undefined> {
    return this.codeLists.get(id);
  }

  /**
   * Get code list by name
   */
  async getCodeListByName(name: string): Promise<CodeList | undefined> {
    return Array.from(this.codeLists.values()).find(cl => cl.name === name);
  }

  /**
   * Add code to code list
   */
  async addCode(
    codeListId: string,
    code: Omit<Code, 'sortOrder' | 'active' | 'attributes'>
  ): Promise<CodeList> {
    const codeList = this.codeLists.get(codeListId);
    if (!codeList) {
      throw new Error(`Code list ${codeListId} not found`);
    }

    const newCode: Code = {
      ...code,
      sortOrder: codeList.codes.length,
      active: true,
      attributes: {}
    };

    codeList.codes.push(newCode);
    codeList.version++;
    codeList.metadata.updatedAt = new Date();

    this.indexCodes(codeList);

    return codeList;
  }

  /**
   * Lookup code value
   */
  async lookupCode(codeListName: string, code: string): Promise<Code | undefined> {
    const index = this.codeIndex.get(codeListName);
    return index?.get(code);
  }

  /**
   * Create lookup table
   */
  async createLookupTable(
    name: string,
    description: string,
    sourceFields: string[],
    targetFields: string[],
    mappings: LookupMapping[]
  ): Promise<LookupTable> {
    const table: LookupTable = {
      id: uuidv4(),
      name,
      description,
      sourceFields,
      targetFields,
      mappings,
      version: 1,
      cacheEnabled: true
    };

    this.lookupTables.set(table.id, table);

    return table;
  }

  /**
   * Perform lookup
   */
  async lookup(
    tableName: string,
    sourceValues: Record<string, unknown>
  ): Promise<Record<string, unknown> | undefined> {
    const table = Array.from(this.lookupTables.values()).find(t => t.name === tableName);
    if (!table) return undefined;

    for (const mapping of table.mappings) {
      if (!mapping.active) continue;

      let match = true;
      for (const field of table.sourceFields) {
        if (mapping.sourceValues[field] !== sourceValues[field]) {
          match = false;
          break;
        }
      }

      if (match) {
        return mapping.targetValues;
      }
    }

    return undefined;
  }

  /**
   * Index codes for fast lookup
   */
  private indexCodes(codeList: CodeList): void {
    const index = new Map<string, Code>();
    for (const code of codeList.codes) {
      if (code.active) {
        index.set(code.code, code);
      }
    }
    this.codeIndex.set(codeList.name, index);
  }

  /**
   * Get all active code lists
   */
  async getActiveCodeLists(): Promise<CodeList[]> {
    return Array.from(this.codeLists.values()).filter(cl => cl.status === 'active');
  }

  /**
   * Deprecate code list
   */
  async deprecateCodeList(id: string, updatedBy: string): Promise<CodeList> {
    const codeList = this.codeLists.get(id);
    if (!codeList) {
      throw new Error(`Code list ${id} not found`);
    }

    codeList.status = 'deprecated';
    codeList.validTo = new Date();
    codeList.metadata.updatedAt = new Date();
    codeList.metadata.updatedBy = updatedBy;

    return codeList;
  }
}
