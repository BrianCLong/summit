"use strict";
/**
 * Unit tests for TimeIndex
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const TimeIndex_js_1 = require("../indexes/TimeIndex.js");
(0, globals_1.describe)('TimeIndex', () => {
    let index;
    (0, globals_1.beforeEach)(() => {
        index = (0, TimeIndex_js_1.createTimeIndex)();
    });
    (0, globals_1.describe)('insert', () => {
        (0, globals_1.it)('inserts entries correctly', () => {
            index.insert({
                id: '1',
                entityId: 'entity-1',
                start: 0,
                end: 100,
                data: { name: 'test' },
            });
            (0, globals_1.expect)(index.count).toBe(1);
            (0, globals_1.expect)(index.has('1')).toBe(true);
        });
        (0, globals_1.it)('updates existing entry on duplicate id', () => {
            index.insert({
                id: '1',
                entityId: 'entity-1',
                start: 0,
                end: 100,
                data: { name: 'original' },
            });
            index.insert({
                id: '1',
                entityId: 'entity-1',
                start: 50,
                end: 150,
                data: { name: 'updated' },
            });
            (0, globals_1.expect)(index.count).toBe(1);
            (0, globals_1.expect)(index.get('1')?.data.name).toBe('updated');
            (0, globals_1.expect)(index.get('1')?.start).toBe(50);
        });
    });
    (0, globals_1.describe)('delete', () => {
        (0, globals_1.it)('deletes existing entry', () => {
            index.insert({
                id: '1',
                entityId: 'entity-1',
                start: 0,
                end: 100,
                data: { name: 'test' },
            });
            (0, globals_1.expect)(index.delete('1')).toBe(true);
            (0, globals_1.expect)(index.count).toBe(0);
            (0, globals_1.expect)(index.has('1')).toBe(false);
        });
        (0, globals_1.it)('returns false for non-existent entry', () => {
            (0, globals_1.expect)(index.delete('non-existent')).toBe(false);
        });
    });
    (0, globals_1.describe)('findOverlapping', () => {
        (0, globals_1.beforeEach)(() => {
            index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
            index.insert({ id: '2', entityId: 'e1', start: 50, end: 150, data: { name: 'b' } });
            index.insert({ id: '3', entityId: 'e2', start: 200, end: 300, data: { name: 'c' } });
            index.insert({ id: '4', entityId: 'e2', start: 250, end: 350, data: { name: 'd' } });
        });
        (0, globals_1.it)('finds all overlapping entries', () => {
            const results = index.findOverlapping({ start: 75, end: 125 });
            (0, globals_1.expect)(results).toHaveLength(2);
            (0, globals_1.expect)(results.map((r) => r.id).sort()).toEqual(['1', '2']);
        });
        (0, globals_1.it)('finds entries at exact timestamp', () => {
            const results = index.findOverlapping({ start: 100, end: 100 });
            (0, globals_1.expect)(results).toHaveLength(2);
        });
        (0, globals_1.it)('returns empty for non-overlapping window', () => {
            const results = index.findOverlapping({ start: 400, end: 500 });
            (0, globals_1.expect)(results).toHaveLength(0);
        });
        (0, globals_1.it)('finds all entries for full range', () => {
            const results = index.findOverlapping({ start: 0, end: 500 });
            (0, globals_1.expect)(results).toHaveLength(4);
        });
    });
    (0, globals_1.describe)('findAtTime', () => {
        (0, globals_1.beforeEach)(() => {
            index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
            index.insert({ id: '2', entityId: 'e1', start: 50, end: 150, data: { name: 'b' } });
        });
        (0, globals_1.it)('finds entries containing timestamp', () => {
            const results = index.findAtTime(75);
            (0, globals_1.expect)(results).toHaveLength(2);
        });
        (0, globals_1.it)('returns empty for timestamp outside all intervals', () => {
            const results = index.findAtTime(200);
            (0, globals_1.expect)(results).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('findByEntity', () => {
        (0, globals_1.beforeEach)(() => {
            index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
            index.insert({ id: '2', entityId: 'e1', start: 200, end: 300, data: { name: 'b' } });
            index.insert({ id: '3', entityId: 'e2', start: 50, end: 150, data: { name: 'c' } });
        });
        (0, globals_1.it)('finds all entries for entity', () => {
            const results = index.findByEntity('e1');
            (0, globals_1.expect)(results).toHaveLength(2);
            (0, globals_1.expect)(results.every((r) => r.entityId === 'e1')).toBe(true);
        });
        (0, globals_1.it)('returns empty for non-existent entity', () => {
            const results = index.findByEntity('non-existent');
            (0, globals_1.expect)(results).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('findByEntityInWindow', () => {
        (0, globals_1.beforeEach)(() => {
            index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
            index.insert({ id: '2', entityId: 'e1', start: 200, end: 300, data: { name: 'b' } });
            index.insert({ id: '3', entityId: 'e2', start: 50, end: 150, data: { name: 'c' } });
        });
        (0, globals_1.it)('finds entity entries in time window', () => {
            const results = index.findByEntityInWindow('e1', { start: 0, end: 150 });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].id).toBe('1');
        });
        (0, globals_1.it)('returns empty for entity outside window', () => {
            const results = index.findByEntityInWindow('e1', { start: 400, end: 500 });
            (0, globals_1.expect)(results).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('getEntityIds', () => {
        (0, globals_1.it)('returns all unique entity IDs', () => {
            index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
            index.insert({ id: '2', entityId: 'e1', start: 200, end: 300, data: { name: 'b' } });
            index.insert({ id: '3', entityId: 'e2', start: 50, end: 150, data: { name: 'c' } });
            const entityIds = index.getEntityIds();
            (0, globals_1.expect)(entityIds.sort()).toEqual(['e1', 'e2']);
        });
    });
    (0, globals_1.describe)('getTimeBounds', () => {
        (0, globals_1.it)('returns null for empty index', () => {
            (0, globals_1.expect)(index.getTimeBounds()).toBeNull();
        });
        (0, globals_1.it)('returns correct bounds', () => {
            index.insert({ id: '1', entityId: 'e1', start: 50, end: 100, data: { name: 'a' } });
            index.insert({ id: '2', entityId: 'e1', start: 200, end: 300, data: { name: 'b' } });
            const bounds = index.getTimeBounds();
            (0, globals_1.expect)(bounds).toEqual({ start: 50, end: 300 });
        });
    });
    (0, globals_1.describe)('clear', () => {
        (0, globals_1.it)('removes all entries', () => {
            index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
            index.insert({ id: '2', entityId: 'e1', start: 200, end: 300, data: { name: 'b' } });
            index.clear();
            (0, globals_1.expect)(index.count).toBe(0);
            (0, globals_1.expect)(index.getEntityIds()).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('entries iterator', () => {
        (0, globals_1.it)('iterates over all entries', () => {
            index.insert({ id: '1', entityId: 'e1', start: 0, end: 100, data: { name: 'a' } });
            index.insert({ id: '2', entityId: 'e2', start: 200, end: 300, data: { name: 'b' } });
            const entries = Array.from(index.entries());
            (0, globals_1.expect)(entries).toHaveLength(2);
        });
    });
});
