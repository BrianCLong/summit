"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const projectRoot = process.cwd();
const reportPath = path_1.default.join(projectRoot, 'reports', 'dead-code-report.json');
function patternToRegex(pattern) {
    const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '___GLOBSTAR___')
        .replace(/\*/g, '[^/]*')
        .replace(/___GLOBSTAR___/g, '.*');
    return new RegExp(`^${escaped}$`);
}
function loadCodeOwners() {
    const codeownersFile = path_1.default.join(projectRoot, 'CODEOWNERS');
    if (!fs_1.default.existsSync(codeownersFile)) {
        return [];
    }
    const lines = fs_1.default.readFileSync(codeownersFile, 'utf8').split(/\r?\n/);
    const patterns = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const [pattern, ...owners] = trimmed.split(/\s+/);
        if (!pattern || owners.length === 0) {
            continue;
        }
        const regex = patternToRegex(pattern.startsWith('/') ? pattern.slice(1) : pattern);
        patterns.push({ pattern, owners, regex });
    }
    return patterns;
}
function resolveOwner(relativePath, patterns) {
    for (let i = patterns.length - 1; i >= 0; i -= 1) {
        const { regex, owners } = patterns[i];
        if (regex.test(relativePath)) {
            return owners.join(' ');
        }
    }
    return undefined;
}
function hasKeepAnnotation(node) {
    const text = node.getFullText();
    return /@experimental|@keep|KEEP/.test(text);
}
function loadBundlerHints() {
    const hintFiles = [
        path_1.default.join(projectRoot, 'reports', 'bundle-stats.json'),
        path_1.default.join(projectRoot, 'reports', 'webpack-stats.json'),
    ];
    const hints = new Set();
    for (const file of hintFiles) {
        if (!fs_1.default.existsSync(file)) {
            continue;
        }
        try {
            const parsed = JSON.parse(fs_1.default.readFileSync(file, 'utf8'));
            if (Array.isArray(parsed.unusedModules)) {
                parsed.unusedModules
                    .map((entry) => path_1.default.normalize(path_1.default.join(projectRoot, entry)))
                    .forEach((entry) => hints.add(entry));
            }
        }
        catch (error) {
            console.warn(`Could not parse bundler hints from ${file}:`, error);
        }
    }
    return hints;
}
function loadTsConfig() {
    const configPath = typescript_1.default.findConfigFile(projectRoot, typescript_1.default.sys.fileExists, 'tsconfig.json');
    if (!configPath) {
        throw new Error('tsconfig.json not found');
    }
    const configFile = typescript_1.default.readConfigFile(configPath, typescript_1.default.sys.readFile);
    if (configFile.error) {
        throw new Error(typescript_1.default.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
    }
    return typescript_1.default.parseJsonConfigFileContent(configFile.config, typescript_1.default.sys, path_1.default.dirname(configPath));
}
function createLanguageService(config) {
    const fileVersions = new Map();
    const servicesHost = {
        getScriptFileNames: () => config.fileNames,
        getScriptVersion: (fileName) => (fileVersions.get(fileName) ?? 0).toString(),
        getScriptSnapshot: (fileName) => {
            if (!typescript_1.default.sys.fileExists(fileName)) {
                return undefined;
            }
            return typescript_1.default.ScriptSnapshot.fromString(typescript_1.default.sys.readFile(fileName) ?? '');
        },
        getCurrentDirectory: () => projectRoot,
        getCompilationSettings: () => config.options,
        getDefaultLibFileName: (options) => typescript_1.default.getDefaultLibFilePath(options),
        fileExists: typescript_1.default.sys.fileExists,
        readFile: typescript_1.default.sys.readFile,
        readDirectory: typescript_1.default.sys.readDirectory,
        directoryExists: typescript_1.default.sys.directoryExists,
        getDirectories: typescript_1.default.sys.getDirectories,
    };
    return typescript_1.default.createLanguageService(servicesHost, typescript_1.default.createDocumentRegistry());
}
function getDeclarationIdentifier(declaration) {
    if ('name' in declaration && declaration.name && typescript_1.default.isIdentifier(declaration.name)) {
        return declaration.name;
    }
    if (typescript_1.default.isVariableStatement(declaration)) {
        const [first] = declaration.declarationList.declarations;
        if (first && typescript_1.default.isIdentifier(first.name)) {
            return first.name;
        }
    }
    return undefined;
}
function findUnusedExports(languageService, checker, sourceFiles, ownerPatterns) {
    const unused = [];
    for (const sourceFile of sourceFiles) {
        if (sourceFile.isDeclarationFile) {
            continue;
        }
        const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
        if (!moduleSymbol) {
            continue;
        }
        const exports = checker.getExportsOfModule(moduleSymbol);
        for (const exportSymbol of exports) {
            if (exportSymbol.getName() === 'default') {
                continue;
            }
            const declarations = exportSymbol.getDeclarations() ?? [];
            for (const declaration of declarations) {
                if (hasKeepAnnotation(declaration)) {
                    continue;
                }
                const identifier = getDeclarationIdentifier(declaration);
                if (!identifier) {
                    continue;
                }
                const fileName = declaration.getSourceFile().fileName;
                const references = languageService.findReferences(fileName, identifier.getStart());
                const nonDefinitionRefs = (references ?? [])
                    .flatMap((ref) => ref.references)
                    .filter((ref) => !ref.isDefinition);
                if (nonDefinitionRefs.length === 0) {
                    const relativePath = path_1.default.relative(projectRoot, fileName);
                    const owner = resolveOwner(relativePath, ownerPatterns);
                    unused.push({
                        type: 'unused-export',
                        file: relativePath,
                        symbolName: exportSymbol.getName(),
                        reason: 'Exported symbol has no non-definition references in the project graph.',
                        confidence: 'high',
                        owner,
                    });
                }
            }
        }
    }
    return unused;
}
function findUnreferencedModules(program, sourceFiles, ownerPatterns, bundlerHints) {
    const inboundCounts = new Map();
    for (const file of sourceFiles) {
        inboundCounts.set(path_1.default.normalize(file.fileName), 0);
    }
    for (const sourceFile of sourceFiles) {
        const resolvedModules = sourceFile
            .resolvedModules;
        resolvedModules?.forEach((resolved) => {
            if (!resolved || !resolved.resolvedFileName) {
                return;
            }
            const normalized = path_1.default.normalize(resolved.resolvedFileName);
            if (inboundCounts.has(normalized)) {
                inboundCounts.set(normalized, (inboundCounts.get(normalized) ?? 0) + 1);
            }
        });
    }
    const unreferenced = [];
    inboundCounts.forEach((count, fileName) => {
        const sourceFile = program.getSourceFile(fileName);
        if (!sourceFile || sourceFile.isDeclarationFile) {
            return;
        }
        if (hasKeepAnnotation(sourceFile)) {
            return;
        }
        const relativePath = path_1.default.relative(projectRoot, fileName);
        if (relativePath.includes('__tests__') || relativePath.includes('.test.') || relativePath.includes('.spec.')) {
            return;
        }
        const bundlerMarkedUnused = bundlerHints.has(fileName) || bundlerHints.has(relativePath);
        if (count === 0 || bundlerMarkedUnused) {
            const owner = resolveOwner(relativePath, ownerPatterns);
            unreferenced.push({
                type: 'unreferenced-module',
                file: relativePath,
                reason: bundlerMarkedUnused
                    ? 'Bundler reports mark this module as unused.'
                    : 'No inbound imports detected by the TypeScript module graph.',
                confidence: 'high',
                owner,
            });
        }
    });
    return unreferenced;
}
function isEligibleSource(fileName) {
    const normalized = path_1.default.normalize(fileName);
    const isSourceFile = /\.(ts|tsx|js|jsx)$/.test(normalized) && !normalized.endsWith('.d.ts');
    const excluded = normalized.includes('node_modules') || normalized.includes('/dist/') || normalized.includes('/build/') || normalized.includes('/.turbo/');
    return isSourceFile && !excluded;
}
function main() {
    const config = loadTsConfig();
    const languageService = createLanguageService(config);
    const program = languageService.getProgram();
    if (!program) {
        throw new Error('Unable to create TypeScript program for analysis');
    }
    const ownerPatterns = loadCodeOwners();
    const bundlerHints = loadBundlerHints();
    const sourceFiles = program.getSourceFiles().filter((file) => isEligibleSource(file.fileName));
    const unusedExports = findUnusedExports(languageService, program.getTypeChecker(), sourceFiles, ownerPatterns);
    const unreferencedModules = findUnreferencedModules(program, sourceFiles, ownerPatterns, bundlerHints);
    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            unusedExportCount: unusedExports.length,
            unreferencedModuleCount: unreferencedModules.length,
        },
        candidates: {
            unusedExports,
            unreferencedModules,
        },
    };
    fs_1.default.mkdirSync(path_1.default.dirname(reportPath), { recursive: true });
    fs_1.default.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Dead-code analysis complete. Report written to ${path_1.default.relative(projectRoot, reportPath)}`);
    console.log(` - Unused exports: ${unusedExports.length}\n - Unreferenced modules: ${unreferencedModules.length}\n - Bundler hints: ${bundlerHints.size}`);
}
main();
