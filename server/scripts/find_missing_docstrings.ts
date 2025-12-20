
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../src');

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        // Exclude test files and definition files
        if (!filePath.endsWith('.d.ts') && !filePath.includes('.test.') && !filePath.includes('.spec.') && !filePath.includes('__tests__')) {
            fileList.push(filePath);
        }
      }
    }
  });
  return fileList;
}

function hasDocstring(node: ts.Node): boolean {
  // @ts-ignore
  const jsDoc = node.jsDoc;
  if (jsDoc && jsDoc.length > 0) {
    return true;
  }
  return false;
}

function isExported(node: ts.Node): boolean {
  if (!node.modifiers) {
    return false;
  }
  return node.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function checkFile(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );

  const missingDocs: string[] = [];

  function visit(node: ts.Node) {
    let name = '';
    let kind = '';
    let shouldCheck = false;
    let isNodeExported = isExported(node);

    // Handle VariableStatements (export const foo = ...)
    if (ts.isVariableStatement(node)) {
        if (isNodeExported) {
            node.declarationList.declarations.forEach(decl => {
                 if (ts.isIdentifier(decl.name)) {
                     // Check if it's a function or arrow function or class expression
                     if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer) || ts.isClassExpression(decl.initializer))) {
                         // It is an exported function/class variable
                         if (!hasDocstring(node)) { // JSDoc is usually on the statement
                              missingDocs.push(`Variable: ${decl.name.text}`);
                         }
                     }
                 }
            });
        }
        // VariableStatement children are declarations, we handled them.
        return;
    }

    if (ts.isFunctionDeclaration(node)) {
      if (isNodeExported) {
          shouldCheck = true;
          name = node.name?.text || 'anonymous';
          kind = 'Function';
      }
    } else if (ts.isClassDeclaration(node)) {
      if (isNodeExported) {
          shouldCheck = true;
          name = node.name?.text || 'anonymous';
          kind = 'Class';

          // Check methods
          node.members.forEach(member => {
              if (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) {
                 // Check visibility
                 const isPrivate = member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword);
                 // If it's public (default) or explicitly public
                 if (!isPrivate) {
                      if (!hasDocstring(member)) {
                          const memberName = (member.name as ts.Identifier).text || 'anonymous';
                          missingDocs.push(`Method/Prop: ${name}.${memberName}`);
                      }
                 }
              }
          });
      }
    } else if (ts.isInterfaceDeclaration(node)) {
      if (isNodeExported) {
          shouldCheck = true;
          name = node.name.text;
          kind = 'Interface';
      }
    } else if (ts.isEnumDeclaration(node)) {
      if (isNodeExported) {
          shouldCheck = true;
          name = node.name.text;
          kind = 'Enum';
      }
    }

    if (shouldCheck) {
      if (!hasDocstring(node)) {
        missingDocs.push(`${kind}: ${name}`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (missingDocs.length > 0) {
    console.log(`\nFile: ${path.relative(path.resolve(__dirname, '../..'), filePath)}`);
    missingDocs.forEach((doc) => console.log(`  - [ ] ${doc}`));
  }
}

const files = getAllFiles(rootDir);
console.log(`Scanning ${files.length} files...`);
files.forEach((file) => {
  try {
    checkFile(file);
  } catch (e) {
    console.error(`Error processing ${file}:`, e);
  }
});
