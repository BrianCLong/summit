"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryS3Storage = exports.InMemoryKafkaEventLog = exports.InMemoryElasticsearchConnector = exports.InMemoryPostgresConnector = void 0;
const clone = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};
const cloneRows = (rows) => rows.map((row) => ({ ...row, data: clone(row.data) }));
class InMemoryPostgresConnector {
    name = 'postgres';
    rows;
    calls = { collect: 0, rectify: 0, delete: 0 };
    constructor(rows) {
        this.rows = cloneRows(rows);
    }
    subjects() {
        return Array.from(new Set(this.rows.map((row) => row.subjectId))).sort();
    }
    orderedRows() {
        return cloneRows(this.rows
            .slice()
            .sort((a, b) => `${a.subjectId}:${a.table}`.localeCompare(`${b.subjectId}:${b.table}`)));
    }
    async collect(subjectId, tenantId) {
        this.calls.collect += 1;
        return this.orderedRows().filter((row) => row.subjectId === subjectId && row.tenantId === tenantId);
    }
    async rectify(subjectId, tenantId, patch) {
        this.calls.rectify += 1;
        Object.entries(patch).forEach(([table, value]) => {
            const target = this.rows.find((row) => row.subjectId === subjectId &&
                row.tenantId === tenantId &&
                row.table === table);
            if (target) {
                target.data = { ...target.data, ...value };
            }
            else {
                this.rows.push({
                    table,
                    tenantId,
                    subjectId,
                    data: clone(value),
                });
            }
        });
    }
    async delete(subjectId, tenantId) {
        this.calls.delete += 1;
        this.rows = this.rows.filter((row) => !(row.subjectId === subjectId && row.tenantId === tenantId));
    }
    async snapshot() {
        return {
            data: this.orderedRows(),
            subjectIds: this.subjects(),
        };
    }
    getRows(subjectId, tenantId) {
        return cloneRows(this.rows.filter((row) => row.subjectId === subjectId && row.tenantId === tenantId));
    }
}
exports.InMemoryPostgresConnector = InMemoryPostgresConnector;
const cloneDocuments = (documents) => documents.map((doc) => ({ ...doc, body: clone(doc.body) }));
class InMemoryElasticsearchConnector {
    name = 'elasticsearch';
    documents;
    calls = { collect: 0, rectify: 0, delete: 0 };
    constructor(documents) {
        this.documents = cloneDocuments(documents);
    }
    subjects() {
        return Array.from(new Set(this.documents.map((doc) => doc.subjectId))).sort();
    }
    orderedDocuments() {
        return cloneDocuments(this.documents
            .slice()
            .sort((a, b) => `${a.subjectId}:${a.index}:${a.id}`.localeCompare(`${b.subjectId}:${b.index}:${b.id}`)));
    }
    async collect(subjectId, tenantId) {
        this.calls.collect += 1;
        return this.orderedDocuments().filter((doc) => doc.subjectId === subjectId && doc.tenantId === tenantId);
    }
    async rectify(subjectId, tenantId, patch) {
        this.calls.rectify += 1;
        Object.entries(patch).forEach(([index, value]) => {
            this.documents
                .filter((doc) => doc.subjectId === subjectId &&
                doc.tenantId === tenantId &&
                doc.index === index)
                .forEach((doc) => {
                doc.body = { ...doc.body, ...value };
            });
        });
    }
    async delete(subjectId, tenantId) {
        this.calls.delete += 1;
        this.documents = this.documents.filter((doc) => !(doc.subjectId === subjectId && doc.tenantId === tenantId));
    }
    async snapshot() {
        return {
            data: this.orderedDocuments(),
            subjectIds: this.subjects(),
        };
    }
    getDocuments(subjectId, tenantId) {
        return cloneDocuments(this.documents.filter((doc) => doc.subjectId === subjectId && doc.tenantId === tenantId));
    }
}
exports.InMemoryElasticsearchConnector = InMemoryElasticsearchConnector;
class InMemoryKafkaEventLog {
    events = [];
    async publish(topic, message) {
        this.events.push({ topic, ...clone(message) });
    }
    history() {
        return this.events.slice();
    }
}
exports.InMemoryKafkaEventLog = InMemoryKafkaEventLog;
class InMemoryS3Storage {
    baseUri;
    bucket = new Map();
    constructor(baseUri = 's3://dfe-fixtures') {
        this.baseUri = baseUri;
    }
    async putObject(key, body) {
        this.bucket.set(key, body);
        return `${this.baseUri}/${key}`;
    }
    async getObject(key) {
        return this.bucket.get(key);
    }
}
exports.InMemoryS3Storage = InMemoryS3Storage;
