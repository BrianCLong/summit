"use strict";
/**
 * Reference Data Manager
 * Manages code lists, lookup tables, and standard nomenclature
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceDataManager = void 0;
const uuid_1 = require("uuid");
class ReferenceDataManager {
    codeLists;
    lookupTables;
    codeIndex;
    constructor() {
        this.codeLists = new Map();
        this.lookupTables = new Map();
        this.codeIndex = new Map();
    }
    /**
     * Create new code list
     */
    async createCodeList(name, description, domain, codes, owner) {
        const codeList = {
            id: (0, uuid_1.v4)(),
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
    async getCodeList(id) {
        return this.codeLists.get(id);
    }
    /**
     * Get code list by name
     */
    async getCodeListByName(name) {
        return Array.from(this.codeLists.values()).find(cl => cl.name === name);
    }
    /**
     * Add code to code list
     */
    async addCode(codeListId, code) {
        const codeList = this.codeLists.get(codeListId);
        if (!codeList) {
            throw new Error(`Code list ${codeListId} not found`);
        }
        const newCode = {
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
    async lookupCode(codeListName, code) {
        const index = this.codeIndex.get(codeListName);
        return index?.get(code);
    }
    /**
     * Create lookup table
     */
    async createLookupTable(name, description, sourceFields, targetFields, mappings) {
        const table = {
            id: (0, uuid_1.v4)(),
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
    async lookup(tableName, sourceValues) {
        const table = Array.from(this.lookupTables.values()).find(t => t.name === tableName);
        if (!table)
            return undefined;
        for (const mapping of table.mappings) {
            if (!mapping.active)
                continue;
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
    indexCodes(codeList) {
        const index = new Map();
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
    async getActiveCodeLists() {
        return Array.from(this.codeLists.values()).filter(cl => cl.status === 'active');
    }
    /**
     * Deprecate code list
     */
    async deprecateCodeList(id, updatedBy) {
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
exports.ReferenceDataManager = ReferenceDataManager;
