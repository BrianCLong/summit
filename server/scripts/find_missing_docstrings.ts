
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../src');
const EXCLUDED_DIRS = ['__tests__', 'tests', 'node_modules', 'test'];
const EXCLUDED_FILES = ['.test.ts', '.spec.ts', '.d.ts'];

function getAllFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            if (!EXCLUDED_DIRS.includes(item.name)) {
                files.push(...getAllFiles(path.join(dir, item.name)));
            }
        } else {
            if (item.name.endsWith('.ts') || item.name.endsWith('.js')) {
                if (!EXCLUDED_FILES.some(ext => item.name.endsWith(ext))) {
                    files.push(path.join(dir, item.name));
                }
            }
        }
    }
    return files;
}

interface MissingDoc {
    file: string;
    line: number;
    name: string;
    kind: string;
}

function checkFile(filePath: string): MissingDoc[] {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
        filePath,
        fileContent,
        ts.ScriptTarget.Latest,
        true
    );

    const missing: MissingDoc[] = [];

    function hasDocstring(node: ts.Node): boolean {
        // A more robust way using just AST:
        // @ts-ignore
        const jsDoc = (node as any).jsDoc;
        if (jsDoc && jsDoc.length > 0) return true;

        // Fallback: check leading comments
        const fullText = sourceFile.getFullText();
        const comments = ts.getLeadingCommentRanges(fullText, node.pos);
        if (comments) {
            for (const comment of comments) {
                if (comment.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
                    const commentText = fullText.substring(comment.pos, comment.end);
                    if (commentText.startsWith('/**')) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function visit(node: ts.Node) {
        let name = '';
        let kind = '';
        let isExported = false;

        // Check modifiers for 'export'
        if (ts.canHaveModifiers(node)) {
            const modifiers = ts.getModifiers(node);
            if (modifiers && modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                isExported = true;
            }
        }

        // Handle export default
        if (ts.canHaveModifiers(node)) {
             const modifiers = ts.getModifiers(node);
             if (modifiers && modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) {
                 // Usually default export is on the declaration or a separate statement
                 isExported = true;
             }
        }


        if (ts.isFunctionDeclaration(node)) {
            if (isExported && node.name) {
                name = node.name.text;
                kind = 'Function';
            }
        } else if (ts.isClassDeclaration(node)) {
            if (isExported && node.name) {
                name = node.name.text;
                kind = 'Class';

                // Check public methods
                node.members.forEach(member => {
                    if (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) {
                        // Check visibility
                        let isPublic = true;
                        const memberModifiers = ts.getModifiers(member);
                        if (memberModifiers) {
                            if (memberModifiers.some(m => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword)) {
                                isPublic = false;
                            }
                        }

                        if (isPublic && member.name) {
                             // Check docstring for method
                             if (!hasDocstring(member)) {
                                 const { line } = sourceFile.getLineAndCharacterOfPosition(member.getStart());
                                 let memberName = '';
                                 if (ts.isIdentifier(member.name)) memberName = member.name.text;

                                 if (memberName) {
                                    missing.push({
                                        file: path.relative(ROOT_DIR, filePath),
                                        line: line + 1,
                                        name: `${name}.${memberName}`,
                                        kind: 'Method'
                                    });
                                 }
                             }
                        }
                    }
                });

            }
        } else if (ts.isInterfaceDeclaration(node)) {
            if (isExported && node.name) {
                name = node.name.text;
                kind = 'Interface';
            }
        } else if (ts.isVariableStatement(node)) {
             if (isExported) {
                 node.declarationList.declarations.forEach(decl => {
                     if (ts.isIdentifier(decl.name)) {
                         name = decl.name.text;
                         kind = 'Variable';
                         // Check if it's missing docstring.
                         // The docstring is usually on the VariableStatement, not the declaration,
                         // unless it is destructured, but we assume simple exports.
                         if (!hasDocstring(node)) { // Check the statement
                              const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                              missing.push({
                                  file: path.relative(ROOT_DIR, filePath),
                                  line: line + 1,
                                  name: name,
                                  kind: kind
                              });
                         }
                         // clear name so we don't double add below
                         name = '';
                     }
                 });
             }
        } else if (ts.isEnumDeclaration(node)) {
            if (isExported && node.name) {
                name = node.name.text;
                kind = 'Enum';
            }
        } else if (ts.isTypeAliasDeclaration(node)) {
             if (isExported && node.name) {
                 name = node.name.text;
                 kind = 'TypeAlias';
             }
        }

        if (name && kind !== 'Variable') { // Variables handled inside loop
            if (!hasDocstring(node)) {
                const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                missing.push({
                    file: path.relative(ROOT_DIR, filePath),
                    line: line + 1,
                    name: name,
                    kind: kind
                });
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return missing;
}

async function main() {
    console.log('Scanning for missing docstrings in server/src...');
    const files = getAllFiles(ROOT_DIR);
    let totalMissing = 0;

    for (const file of files) {
        try {
            const missing = checkFile(file);
            if (missing.length > 0) {
                totalMissing += missing.length;
                for (const m of missing) {
                    console.log(`${m.file}:${m.line} [${m.kind}] ${m.name}`);
                }
            }
        } catch (e) {
            console.error(`Error parsing ${file}:`, e);
        }
    }

    console.log(`\nTotal missing docstrings: ${totalMissing}`);
}

main();
