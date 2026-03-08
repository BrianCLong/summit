"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const query_parser_js_1 = require("../query-parser.js");
(0, globals_1.describe)('parseQuery', () => {
    (0, globals_1.it)('parses basic terms', () => {
        const res = (0, query_parser_js_1.parseQuery)('hello world');
        (0, globals_1.expect)(res.term).toBe('hello world');
    });
    (0, globals_1.it)('parses filters', () => {
        const res = (0, query_parser_js_1.parseQuery)('status:open owner:me bug');
        (0, globals_1.expect)(res.term).toBe('bug');
        (0, globals_1.expect)(res.filters['status']).toBe('open');
        (0, globals_1.expect)(res.filters['owner']).toBe('me');
    });
    (0, globals_1.it)('parses quoted filters', () => {
        const res = (0, query_parser_js_1.parseQuery)('title:"severe bug"');
        (0, globals_1.expect)(res.filters['title']).toBe('severe bug');
        (0, globals_1.expect)(res.term).toBe('');
    });
    (0, globals_1.it)('parses temporal operators', () => {
        const res = (0, query_parser_js_1.parseQuery)('since:2023-01-01');
        (0, globals_1.expect)(res.temporal).toHaveLength(1);
        (0, globals_1.expect)(res.temporal[0]).toEqual({
            field: 'created_at',
            operator: '>=',
            value: '2023-01-01'
        });
    });
    (0, globals_1.it)('parses entities', () => {
        const res = (0, query_parser_js_1.parseQuery)('entity:Intel person:Alice');
        (0, globals_1.expect)(res.entities).toContain('Intel');
        (0, globals_1.expect)(res.entities).toContain('Alice');
    });
    (0, globals_1.it)('parses relationships', () => {
        const res = (0, query_parser_js_1.parseQuery)('rel:ProjectX');
        (0, globals_1.expect)(res.relationships).toHaveLength(1);
        (0, globals_1.expect)(res.relationships[0]).toEqual({
            type: 'RELATED_TO',
            target: 'ProjectX'
        });
    });
});
