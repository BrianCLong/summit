"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConfigFile = parseConfigFile;
exports.loadConfig = loadConfig;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
const interpolate_1 = require("./interpolate");
function parseConfigFile(filePath) {
    const absolute = (0, node_path_1.resolve)(filePath);
    const raw = (0, node_fs_1.readFileSync)(absolute, 'utf8');
    const doc = (0, yaml_1.parseDocument)(raw, {
        prettyErrors: true,
        keepCstNodes: true,
        uniqueKeys: false,
    });
    const diagnostics = [];
    const pointerMap = {};
    if (doc.errors.length) {
        for (const err of doc.errors) {
            diagnostics.push({
                severity: 'error',
                message: err.message,
                pointer: '',
                line: err.linePos?.[0]?.line ?? err.line ?? 0,
                column: err.linePos?.[0]?.col ?? err.col ?? 0,
            });
        }
    }
    if (doc.warnings.length) {
        for (const warning of doc.warnings) {
            diagnostics.push({
                severity: 'warning',
                message: warning.message,
                pointer: '',
                line: warning.linePos?.[0]?.line ?? warning.line ?? 0,
                column: warning.linePos?.[0]?.col ?? warning.col ?? 0,
            });
        }
    }
    if (doc.errors.length) {
        return { document: doc, value: null, diagnostics, pointerMap };
    }
    if (!doc.contents) {
        pointerMap[''] = { line: 1, column: 1 };
        return { document: doc, value: null, diagnostics, pointerMap };
    }
    collectPointers(doc.contents, '', doc, pointerMap);
    const value = doc.toJS({ mapAsMap: false, merge: true });
    return { document: doc, value, diagnostics, pointerMap };
}
function loadConfig(filePath, schema, options = {}) {
    const parsed = parseConfigFile(filePath);
    const diagnostics = [...parsed.diagnostics];
    if (!parsed.value) {
        return { config: null, diagnostics, pointerMap: parsed.pointerMap };
    }
    const interpolationPolicy = options.interpolation ?? {};
    const interpolated = (0, interpolate_1.interpolateConfig)(parsed.value, '', { policy: interpolationPolicy, pointerMap: parsed.pointerMap }, diagnostics);
    const validationDiagnostics = (0, validate_1.validate)(interpolated, schema, {
        pointerMap: parsed.pointerMap,
    });
    diagnostics.push(...validationDiagnostics);
    return {
        config: validationDiagnostics.some((d) => d.severity === 'error') &&
            options.strict
            ? null
            : interpolated,
        diagnostics,
        pointerMap: parsed.pointerMap,
    };
}
function collectPointers(node, pointer, doc, pointerMap) {
    if (!node) {
        return;
    }
    const range = node.range ? doc.rangeAsLinePos(node.range) : undefined;
    if (range) {
        pointerMap[pointer] = {
            line: range.start.line + 1,
            column: range.start.col + 1,
        };
    }
    else if (!(pointer in pointerMap)) {
        pointerMap[pointer] = { line: 0, column: 0 };
    }
    if ((0, yaml_1.isMap)(node)) {
        for (const item of node.items) {
            const key = item.key;
            const value = item.value;
            const keyValue = key?.value?.toString() ?? '';
            const childPointer = pointer
                ? `${pointer}/${(0, interpolate_2.escapeJsonPointerSegment)(keyValue)}`
                : `/${(0, interpolate_2.escapeJsonPointerSegment)(keyValue)}`;
            collectPointers(value, childPointer, doc, pointerMap);
        }
    }
    else if ((0, yaml_1.isSeq)(node)) {
        node.items.forEach((child, index) => {
            collectPointers(child, `${pointer}/${index}`, doc, pointerMap);
        });
    }
}
const validate_1 = require("./validate");
const interpolate_2 = require("./interpolate");
