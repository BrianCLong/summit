"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeStructure = optimizeStructure;
exports.encodeKtoon = encodeKtoon;
exports.decodeKtoon = decodeKtoon;
exports.renderKtoon = renderKtoon;
exports.applyPatches = applyPatches;
const DEFAULT_THRESHOLD = 2;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function tokenFromIndex(index) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    let i = index;
    let token = '';
    do {
        token = alphabet[i % alphabet.length] + token;
        i = Math.floor(i / alphabet.length) - 1;
    } while (i >= 0);
    return token;
}
function collectKeyFrequencies(value, prefix = '', frequencies = {}) {
    if (Array.isArray(value)) {
        value.forEach((entry) => collectKeyFrequencies(entry, prefix, frequencies));
        return frequencies;
    }
    if (isRecord(value)) {
        Object.keys(value).forEach((key) => {
            const path = prefix ? `${prefix}.${key}` : key;
            frequencies[path] = (frequencies[path] ?? 0) + 1;
            collectKeyFrequencies(value[key], path, frequencies);
        });
    }
    return frequencies;
}
function collectValueFrequencies(value, prefix = '', frequencies = {}) {
    if (Array.isArray(value)) {
        value.forEach((entry) => collectValueFrequencies(entry, prefix, frequencies));
        return frequencies;
    }
    if (isRecord(value)) {
        Object.entries(value).forEach(([key, val]) => {
            const path = prefix ? `${prefix}.${key}` : key;
            if (typeof val === 'string') {
                frequencies[path] = frequencies[path] ?? {};
                frequencies[path][val] = (frequencies[path][val] ?? 0) + 1;
            }
            else {
                collectValueFrequencies(val, path, frequencies);
            }
        });
    }
    return frequencies;
}
function buildKeyDictionary(value, threshold = DEFAULT_THRESHOLD) {
    const frequencies = collectKeyFrequencies(value);
    const entries = Object.entries(frequencies)
        .filter(([, count]) => count >= threshold)
        .sort((a, b) => a[0].localeCompare(b[0]));
    const dictionary = {};
    entries.forEach(([path], index) => {
        dictionary[tokenFromIndex(index)] = path;
    });
    return dictionary;
}
function buildValueDictionary(value, threshold = DEFAULT_THRESHOLD) {
    const frequencies = collectValueFrequencies(value);
    const dictionary = {};
    const scopeByPath = {};
    const inverseScopes = {};
    const scopedEntries = Object.entries(frequencies).filter(([, values]) => Object.values(values).some((count) => count >= threshold));
    scopedEntries.sort((a, b) => a[0].localeCompare(b[0])).forEach(([path, values], index) => {
        const scope = tokenFromIndex(index);
        const scopedDict = {};
        Object.entries(values)
            .filter(([, count]) => count >= threshold)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([val], valIndex) => {
            scopedDict[tokenFromIndex(valIndex)] = val;
        });
        if (Object.keys(scopedDict).length > 0) {
            dictionary[scope] = scopedDict;
            scopeByPath[path] = scope;
            inverseScopes[scope] = path;
        }
    });
    return { dictionary, scopeByPath, inverseScopes };
}
function uniformColumns(rows) {
    const objectRows = rows.filter(isRecord);
    if (objectRows.length !== rows.length || objectRows.length === 0) {
        return null;
    }
    const baseKeys = Object.keys(objectRows[0]).sort();
    const uniform = objectRows.every((row) => {
        const keys = Object.keys(row).sort();
        return keys.length === baseKeys.length && keys.every((key, idx) => key === baseKeys[idx]);
    });
    return uniform ? baseKeys : null;
}
function encodeValue(value, path, plan, strict) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'string') {
        if (!strict) {
            const scope = plan.scopeByPath[path];
            if (scope) {
                const inverse = invert(plan.dictionary[scope]);
                if (inverse[value]) {
                    return inverse[value];
                }
            }
        }
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean')
        return value;
    return JSON.stringify(value);
}
function decodeValue(value, path, plan, strict) {
    if (value === null)
        return null;
    if (typeof value === 'string') {
        const scope = plan.scopeByPath[path];
        if (scope && plan.dictionary[scope] && !strict) {
            const decoded = plan.dictionary[scope][value];
            if (decoded !== undefined)
                return decoded;
        }
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    return value;
}
function invert(input) {
    return Object.fromEntries(Object.entries(input).map(([k, v]) => [v, k]));
}
function optimizeStructure(value, plan, strict, name) {
    if (Array.isArray(value)) {
        const columns = uniformColumns(value);
        if (columns) {
            const rows = value.map((row) => columns.map((column) => encodeValue(row[column], name ? `${name}.${column}` : column, plan, strict)));
            return { type: 'table', name, columns, rows };
        }
        return {
            type: 'object',
            value: value.map((entry, idx) => optimizeStructure(entry, plan, strict, name ? `${name}[${idx}]` : `${idx}`))
        };
    }
    if (isRecord(value)) {
        const optimized = {};
        Object.keys(value)
            .sort()
            .forEach((key) => {
            optimized[key] = optimizeStructure(value[key], plan, strict, name ? `${name}.${key}` : key);
        });
        return { type: 'object', value: optimized };
    }
    return { type: 'object', value };
}
function encodeKtoon(input, options = {}) {
    const mode = options.mode ?? 'ktoon';
    const keyDict = buildKeyDictionary(input, options.dictionaryThreshold ?? DEFAULT_THRESHOLD);
    const valuePlan = buildValueDictionary(input, options.dictionaryThreshold ?? DEFAULT_THRESHOLD);
    const body = optimizeStructure(input, valuePlan, mode === 'strict-toon');
    return {
        version: '1',
        mode,
        keys: Object.keys(keyDict).length ? keyDict : undefined,
        values: Object.keys(valuePlan.dictionary).length ? valuePlan.dictionary : undefined,
        valueScopes: Object.keys(valuePlan.scopeByPath).length ? valuePlan.scopeByPath : undefined,
        body
    };
}
function decodeKtoon(doc) {
    const valuePlan = {
        dictionary: doc.values ?? {},
        scopeByPath: doc.valueScopes ?? {},
        inverseScopes: invert(doc.valueScopes ?? {})
    };
    return decodeNode(doc.body, valuePlan, doc.mode === 'strict-toon');
}
function decodeNode(node, plan, strict, prefix = '') {
    if (node.type === 'table') {
        const rows = node.rows.map((row) => {
            const record = {};
            node.columns.forEach((column, idx) => {
                const path = prefix ? `${prefix}.${column}` : column;
                record[column] = decodeValue(row[idx] ?? null, path, plan, strict);
            });
            return record;
        });
        return rows;
    }
    if (node.type === 'ref') {
        throw new Error(`Unresolved reference ${node.ref}`);
    }
    if (isRecord(node.value)) {
        const output = {};
        Object.entries(node.value).forEach(([key, child]) => {
            output[key] = decodeNode(child, plan, strict, prefix ? `${prefix}.${key}` : key);
        });
        return output;
    }
    return node.value;
}
function renderKtoon(doc, strict = false) {
    const lines = [];
    const expandedKeys = invert(doc.keys ?? {});
    if (!strict) {
        lines.push('@ktoon 1');
        if (doc.keys && Object.keys(doc.keys).length) {
            lines.push(`@keys { ${Object.entries(doc.keys)
                .map(([sym, path]) => `${sym}:${path}`)
                .join(' ')} }`);
        }
        if (doc.values && Object.keys(doc.values).length) {
            Object.entries(doc.values).forEach(([scope, mapping]) => {
                lines.push(`@vals ${scope} { ${Object.entries(mapping)
                    .map(([code, val]) => `${code}:${val}`)
                    .join(' ')} }`);
            });
        }
    }
    lines.push(renderNode(doc.body, expandedKeys, doc.values ?? {}, doc.valueScopes ?? {}, strict));
    return lines.filter(Boolean).join('\n');
}
function renderNode(node, keys, values, valueScopes, strict, name) {
    if (node.type === 'table') {
        return renderTable(node, keys, values, valueScopes, strict, name);
    }
    if (node.type === 'ref') {
        return `@ref ${node.ref}`;
    }
    if (Array.isArray(node.value)) {
        const arrayBody = node.value.map((child, idx) => renderNode(child, keys, values, valueScopes, strict, `${name ?? 'item'}[${idx}]`));
        return arrayBody.join('\n');
    }
    if (isRecord(node.value)) {
        const body = Object.entries(node.value).map(([key, child]) => `${renderNode(child, keys, values, valueScopes, strict, key)}`);
        return body.join('\n');
    }
    const literalName = name ? `${name}: ` : '';
    return `${literalName}${JSON.stringify(node.value)}`;
}
function renderTable(table, keys, values, valueScopes, strict, name) {
    const headerNames = table.columns.map((column) => {
        if (strict)
            return column;
        const alias = Object.entries(keys).find(([, path]) => path === (table.name ? `${table.name}.${column}` : column));
        return alias ? alias[0] : column;
    });
    const header = `${table.name ?? 'table'}[${table.rows.length}]{${headerNames.join(',')}}:`;
    const rows = table.rows
        .map((row) => `  ${row
        .map((value, idx) => {
        const column = table.columns[idx];
        const path = table.name ? `${table.name}.${column}` : column;
        const scope = valueScopes[path];
        if (!strict && scope && values[scope]) {
            const decoded = values[scope][String(value)];
            if (decoded !== undefined)
                return decoded;
        }
        return value === null ? '' : String(value);
    })
        .join(',')}`)
        .join('\n');
    return `${header}\n${rows}`;
}
function findTableByName(node, name) {
    if (node.type === 'table' && node.name === name)
        return node;
    if (node.type === 'object' && isRecord(node.value)) {
        for (const child of Object.values(node.value)) {
            const found = findTableByName(child, name);
            if (found)
                return found;
        }
    }
    if (node.type === 'object' && Array.isArray(node.value)) {
        for (const child of node.value) {
            const found = findTableByName(child, name);
            if (found)
                return found;
        }
    }
    return null;
}
function applyPatches(root, patches) {
    const clone = structuredClone(root);
    patches.forEach((patch) => applyPatch(clone, patch));
    return clone;
}
function applyPatch(node, patch) {
    if (node.type === 'table') {
        if (patch.path !== (node.name ?? 'table'))
            return;
        if (patch.op === 'append') {
            patch.rows.forEach((row) => {
                if (Array.isArray(row))
                    node.rows.push(row);
            });
        }
        if (patch.op === 'delete') {
            if (!node.primaryKey)
                throw new Error('Primary key required for delete');
            const keyIndex = node.columns.indexOf(node.primaryKey);
            node.rows = node.rows.filter((row) => !patch.keys.includes(row[keyIndex]));
        }
        if (patch.op === 'update') {
            if (!node.primaryKey)
                throw new Error('Primary key required for update');
            const keyIndex = node.columns.indexOf(node.primaryKey);
            patch.rows.forEach((partial) => {
                const key = partial[patch.key];
                const idx = node.rows.findIndex((row) => row[keyIndex] === key);
                if (idx === -1)
                    return;
                const updated = [...node.rows[idx]];
                Object.entries(partial).forEach(([col, val]) => {
                    const colIdx = node.columns.indexOf(col);
                    if (colIdx !== -1)
                        updated[colIdx] = val;
                });
                node.rows[idx] = updated;
            });
        }
        return;
    }
    if (node.type === 'object' && isRecord(node.value)) {
        if (patch.op === 'set' && patch.path === '') {
            node.value = patch.value;
            return;
        }
        Object.entries(node.value).forEach(([key, child]) => applyPatch(child, patch));
    }
    if (node.type === 'object' && Array.isArray(node.value)) {
        node.value.forEach((child) => applyPatch(child, patch));
    }
}
