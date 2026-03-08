"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlueSchemaRegistry = exports.MockSchemaRegistry = void 0;
// @ts-nocheck
const Logger_js_1 = require("./Logger.js");
const client_glue_1 = require("@aws-sdk/client-glue");
class MockSchemaRegistry {
    schemas = new Map();
    subjects = new Map();
    idCounter = 1;
    logger = new Logger_js_1.Logger('MockSchemaRegistry');
    async register(subject, schema) {
        const id = this.idCounter++;
        this.schemas.set(id, schema);
        this.subjects.set(subject, id);
        this.logger.info(`Registered schema for subject ${subject} with ID ${id}`);
        return id;
    }
    async getId(subject, schema) {
        const id = this.subjects.get(subject);
        if (!id) {
            return this.register(subject, schema);
        }
        return id;
    }
    async getSchema(id) {
        const schema = this.schemas.get(id);
        if (!schema) {
            throw new Error(`Schema with ID ${id} not found`);
        }
        return schema;
    }
    async encode(id, payload) {
        // Wire format: [MagicByte (1)] [SchemaID (4)] [Payload]
        const payloadBuf = Buffer.from(JSON.stringify(payload));
        const buffer = Buffer.alloc(1 + 4 + payloadBuf.length);
        buffer.writeUInt8(0, 0); // Magic Byte
        buffer.writeUInt32BE(id, 1); // Schema ID
        payloadBuf.copy(buffer, 5);
        return buffer;
    }
    async decode(buffer) {
        if (buffer.readUInt8(0) !== 0) {
            throw new Error('Invalid Magic Byte');
        }
        // const schemaId = buffer.readUInt32BE(1);
        const payloadBuf = buffer.subarray(5);
        return JSON.parse(payloadBuf.toString());
    }
}
exports.MockSchemaRegistry = MockSchemaRegistry;
class GlueSchemaRegistry {
    client;
    logger = new Logger_js_1.Logger('GlueSchemaRegistry');
    registryName;
    idCache = new Map();
    constructor(region, registryName) {
        this.client = new client_glue_1.GlueClient({ region });
        this.registryName = registryName;
    }
    async register(subject, schema) {
        // Check cache first
        if (this.idCache.has(subject)) {
            return this.idCache.get(subject);
        }
        try {
            // Try to get existing
            return await this.getId(subject, schema);
        }
        catch (e) {
            if (e.name === 'EntityNotFoundException') {
                try {
                    // Create Schema
                    const schemaDef = JSON.stringify({
                        "$id": `https://example.com/${subject}`,
                        "$schema": "https://json-schema.org/draft/2020-12/schema",
                        "title": subject,
                        "type": "object",
                        "properties": {} // Simplified generic schema
                    });
                    await this.client.send(new client_glue_1.CreateSchemaCommand({
                        RegistryId: { RegistryName: this.registryName },
                        SchemaName: subject,
                        DataFormat: 'JSON',
                        Compatibility: 'BACKWARD',
                        SchemaDefinition: schemaDef
                    }));
                    this.logger.info(`Created new schema for ${subject}`);
                    // Recurse to get ID (assumes creation sets version 1)
                    return await this.getId(subject, schema);
                }
                catch (createErr) {
                    this.logger.error(`Failed to create schema for ${subject}`, createErr);
                    throw createErr;
                }
            }
            throw e;
        }
    }
    async getId(subject, schema) {
        if (this.idCache.has(subject)) {
            return this.idCache.get(subject);
        }
        try {
            const command = new client_glue_1.GetSchemaCommand({
                SchemaId: { SchemaName: subject, RegistryName: this.registryName }
            });
            const response = await this.client.send(command);
            const version = response.LatestSchemaVersion;
            const id = typeof version === 'number' ? version : parseInt(String(version || '1'));
            this.idCache.set(subject, id);
            return id;
        }
        catch (error) {
            // Don't log error here if we expect caller to handle EntityNotFound (like register)
            // But usually getId is called by producer expecting success.
            // Re-throwing so caller can decide.
            throw error;
        }
    }
    async getSchema(id) {
        throw new Error('Method not implemented.');
    }
    async encode(id, payload) {
        const payloadBuf = Buffer.from(JSON.stringify(payload));
        const buffer = Buffer.alloc(1 + 4 + payloadBuf.length);
        buffer.writeUInt8(0, 0); // Magic Byte
        buffer.writeUInt32BE(id, 1); // Schema ID
        payloadBuf.copy(buffer, 5);
        return buffer;
    }
    async decode(buffer) {
        if (buffer.length < 5) {
            throw new Error('Buffer too short');
        }
        if (buffer.readUInt8(0) !== 0) {
            throw new Error('Invalid Magic Byte');
        }
        const payloadBuf = buffer.subarray(5);
        return JSON.parse(payloadBuf.toString());
    }
}
exports.GlueSchemaRegistry = GlueSchemaRegistry;
