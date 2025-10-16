#!/usr/bin/env ts-node
/* eslint-disable no-console */
import { Project, SyntaxKind, ImportDeclaration } from 'ts-morph';
import path from 'path';

const project = new Project({
  tsConfigFilePath: path.resolve('server/tsconfig.json'),
  skipAddingFilesFromTsConfig: false,
});

const files = project.getSourceFiles('server/src/**/routes/**/*.ts');

function shouldSkip(sfPath: string, content: string) {
  const lower = content.toLowerCase();
  if (/(^|\/)(slack|n8n)\.ts$/.test(sfPath)) return true;
  if (lower.includes('raw-body') || lower.includes('req.rawbody')) return true;
  if (lower.includes('verify:') && lower.includes('express.json')) return true;
  return false;
}

let changed = 0;
for (const sf of files) {
  const content = sf.getFullText();
  const sfPath = sf.getFilePath();

  if (shouldSkip(sfPath, content)) continue;

  let fileChanged = false;

  // 1) Remove body-parser import (if any)
  const bp: ImportDeclaration | undefined = sf.getImportDeclaration((i) =>
    /body-parser/.test(i.getModuleSpecifierValue()),
  );
  if (bp) {
    bp.remove();
    fileChanged = true;
  }

  // 2) Ensure default express import exists if body-parser was present
  if (bp) {
    const hasExpressDefault = sf
      .getImportDeclarations()
      .some(
        (d) =>
          d.getModuleSpecifierValue() === 'express' && !!d.getDefaultImport(),
      );
    if (!hasExpressDefault) {
      const e = sf.getImportDeclaration(
        (d) => d.getModuleSpecifierValue() === 'express',
      );
      if (e) e.setDefaultImport('express');
      else
        sf.addImportDeclaration({
          defaultImport: 'express',
          moduleSpecifier: 'express',
        });
      fileChanged = true;
    }
  }

  // 3) Drop unused NextFunction from import list
  const expressImport = sf.getImportDeclaration(
    (d) => d.getModuleSpecifierValue() === 'express',
  );
  if (expressImport) {
    const nextNamed = expressImport
      .getNamedImports()
      .find((n) => n.getName() === 'NextFunction');
    if (nextNamed) {
      const usesNextType = sf
        .getDescendantsOfKind(SyntaxKind.TypeReference)
        .some((tr) => tr.getText() === 'NextFunction');
      const usesNextIdentifier = sf
        .getDescendantsOfKind(SyntaxKind.Identifier)
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
    .filter(
      (n) =>
        n.getKind() === SyntaxKind.ArrowFunction ||
        n.getKind() === SyntaxKind.FunctionExpression,
    );

  for (const fn of candidates) {
    const parent: any = (fn as any).getParent?.();
    if (!parent) continue;
    const ptxt = parent.getText?.() || '';
    if (!/\.(get|post|put|patch|delete|all|use)\(/.test(ptxt)) continue;

    const body: any = (fn as any).getBody?.();
    if (!body) continue;
    if (body.getText().includes('next(')) continue;

    const params: any[] = (fn as any).getParameters?.() || [];
    if (params.length < 3) continue;

    const last: any = params[params.length - 1];
    const name = last.getName?.();
    if (name !== 'next') continue;

    const nextRefs = body
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .filter((i: any) => i.getText() === 'next');
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
