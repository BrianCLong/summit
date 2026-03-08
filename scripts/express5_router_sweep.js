#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const ts_morph_1 = require("ts-morph");
const path_1 = __importDefault(require("path"));
const project = new ts_morph_1.Project({
    tsConfigFilePath: path_1.default.resolve('server/tsconfig.json'),
    skipAddingFilesFromTsConfig: false,
});
const files = project.getSourceFiles('server/src/**/routes/**/*.ts');
function shouldSkip(sfPath, content) {
    const lower = content.toLowerCase();
    if (/(^|\/)(slack|n8n)\.ts$/.test(sfPath))
        return true;
    if (lower.includes('raw-body') || lower.includes('req.rawbody'))
        return true;
    if (lower.includes('verify:') && lower.includes('express.json'))
        return true;
    return false;
}
let changed = 0;
for (const sf of files) {
    const content = sf.getFullText();
    const sfPath = sf.getFilePath();
    if (shouldSkip(sfPath, content))
        continue;
    let fileChanged = false;
    // 1) Remove body-parser import (if any)
    const bp = sf.getImportDeclaration((i) => /body-parser/.test(i.getModuleSpecifierValue()));
    if (bp) {
        bp.remove();
        fileChanged = true;
    }
    // 2) Ensure default express import exists if body-parser was present
    if (bp) {
        const hasExpressDefault = sf
            .getImportDeclarations()
            .some((d) => d.getModuleSpecifierValue() === 'express' && !!d.getDefaultImport());
        if (!hasExpressDefault) {
            const e = sf.getImportDeclaration((d) => d.getModuleSpecifierValue() === 'express');
            if (e)
                e.setDefaultImport('express');
            else
                sf.addImportDeclaration({
                    defaultImport: 'express',
                    moduleSpecifier: 'express',
                });
            fileChanged = true;
        }
    }
    // 3) Drop unused NextFunction from import list
    const expressImport = sf.getImportDeclaration((d) => d.getModuleSpecifierValue() === 'express');
    if (expressImport) {
        const nextNamed = expressImport
            .getNamedImports()
            .find((n) => n.getName() === 'NextFunction');
        if (nextNamed) {
            const usesNextType = sf
                .getDescendantsOfKind(ts_morph_1.SyntaxKind.TypeReference)
                .some((tr) => tr.getText() === 'NextFunction');
            const usesNextIdentifier = sf
                .getDescendantsOfKind(ts_morph_1.SyntaxKind.Identifier)
                .some((id) => id.getText() === 'next');
            if (!usesNextType && !usesNextIdentifier) {
                nextNamed.remove();
                fileChanged = true;
            }
        }
    }
    // 4) Remove unused last param 'next' on handler callbacks where not used
    const candidates = sf
        .getDescendants()
        .filter((n) => n.getKind() === ts_morph_1.SyntaxKind.ArrowFunction ||
        n.getKind() === ts_morph_1.SyntaxKind.FunctionExpression);
    for (const fn of candidates) {
        const parent = fn.getParent?.();
        if (!parent)
            continue;
        const ptxt = parent.getText?.() || '';
        if (!/\.(get|post|put|patch|delete|all|use)\(/.test(ptxt))
            continue;
        const body = fn.getBody?.();
        if (!body)
            continue;
        if (body.getText().includes('next('))
            continue;
        const params = fn.getParameters?.() || [];
        if (params.length < 3)
            continue;
        const last = params[params.length - 1];
        const name = last.getName?.();
        if (name !== 'next')
            continue;
        const nextRefs = body
            .getDescendantsOfKind(ts_morph_1.SyntaxKind.Identifier)
            .filter((i) => i.getText() === 'next');
        if (nextRefs.length === 0) {
            last.remove();
            fileChanged = true;
        }
    }
    if (fileChanged) {
        sf.fixUnusedIdentifiers();
        sf.formatText();
        changed++;
    }
}
project.saveSync();
console.log(`Updated ${changed} file(s).`);
