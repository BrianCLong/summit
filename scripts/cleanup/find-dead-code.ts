import fs from "fs";
import path from "path";
import ts from "typescript";

interface DeadCodeCandidate {
  type: "unused-export" | "unreferenced-module";
  file: string;
  symbolName?: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  owner?: string;
  tags?: string[];
}

interface DeadCodeReport {
  generatedAt: string;
  summary: {
    unusedExportCount: number;
    unreferencedModuleCount: number;
  };
  candidates: {
    unusedExports: DeadCodeCandidate[];
    unreferencedModules: DeadCodeCandidate[];
  };
}

interface CodeOwnerPattern {
  pattern: string;
  owners: string[];
  regex: RegExp;
}

const projectRoot = process.cwd();
const reportPath = path.join(projectRoot, "reports", "dead-code-report.json");

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "___GLOBSTAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___GLOBSTAR___/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function loadCodeOwners(): CodeOwnerPattern[] {
  const codeownersFile = path.join(projectRoot, "CODEOWNERS");
  if (!fs.existsSync(codeownersFile)) {
    return [];
  }

  const lines = fs.readFileSync(codeownersFile, "utf8").split(/\r?\n/);
  const patterns: CodeOwnerPattern[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [pattern, ...owners] = trimmed.split(/\s+/);
    if (!pattern || owners.length === 0) {
      continue;
    }
    const regex = patternToRegex(pattern.startsWith("/") ? pattern.slice(1) : pattern);
    patterns.push({ pattern, owners, regex });
  }

  return patterns;
}

function resolveOwner(relativePath: string, patterns: CodeOwnerPattern[]): string | undefined {
  for (let i = patterns.length - 1; i >= 0; i -= 1) {
    const { regex, owners } = patterns[i];
    if (regex.test(relativePath)) {
      return owners.join(" ");
    }
  }
  return undefined;
}

function hasKeepAnnotation(node: ts.Node): boolean {
  const text = node.getFullText();
  return /@experimental|@keep|KEEP/.test(text);
}

function loadBundlerHints(): Set<string> {
  const hintFiles = [
    path.join(projectRoot, "reports", "bundle-stats.json"),
    path.join(projectRoot, "reports", "webpack-stats.json"),
  ];
  const hints = new Set<string>();

  for (const file of hintFiles) {
    if (!fs.existsSync(file)) {
      continue;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { unusedModules?: string[] };
      if (Array.isArray(parsed.unusedModules)) {
        parsed.unusedModules
          .map((entry) => path.normalize(path.join(projectRoot, entry)))
          .forEach((entry) => hints.add(entry));
      }
    } catch (error) {
      console.warn(`Could not parse bundler hints from ${file}:`, error);
    }
  }

  return hints;
}

function loadTsConfig(): ts.ParsedCommandLine {
  const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    throw new Error("tsconfig.json not found");
  }
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
  }
  return ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
}

function createLanguageService(config: ts.ParsedCommandLine): ts.LanguageService {
  const fileVersions = new Map<string, number>();
  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => config.fileNames,
    getScriptVersion: (fileName) => (fileVersions.get(fileName) ?? 0).toString(),
    getScriptSnapshot: (fileName) => {
      if (!ts.sys.fileExists(fileName)) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName) ?? "");
    },
    getCurrentDirectory: () => projectRoot,
    getCompilationSettings: () => config.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  return ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
}

function getDeclarationIdentifier(declaration: ts.Declaration): ts.Identifier | undefined {
  if ("name" in declaration && declaration.name && ts.isIdentifier(declaration.name)) {
    return declaration.name;
  }
  if (ts.isVariableStatement(declaration)) {
    const [first] = declaration.declarationList.declarations;
    if (first && ts.isIdentifier(first.name)) {
      return first.name;
    }
  }
  return undefined;
}

function findUnusedExports(
  languageService: ts.LanguageService,
  checker: ts.TypeChecker,
  sourceFiles: readonly ts.SourceFile[],
  ownerPatterns: CodeOwnerPattern[]
): DeadCodeCandidate[] {
  const unused: DeadCodeCandidate[] = [];

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
      if (exportSymbol.getName() === "default") {
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
          const relativePath = path.relative(projectRoot, fileName);
          const owner = resolveOwner(relativePath, ownerPatterns);
          unused.push({
            type: "unused-export",
            file: relativePath,
            symbolName: exportSymbol.getName(),
            reason: "Exported symbol has no non-definition references in the project graph.",
            confidence: "high",
            owner,
          });
        }
      }
    }
  }

  return unused;
}

function findUnreferencedModules(
  program: ts.Program,
  sourceFiles: readonly ts.SourceFile[],
  ownerPatterns: CodeOwnerPattern[],
  bundlerHints: Set<string>
): DeadCodeCandidate[] {
  const inboundCounts = new Map<string, number>();

  for (const file of sourceFiles) {
    inboundCounts.set(path.normalize(file.fileName), 0);
  }

  for (const sourceFile of sourceFiles) {
    const resolvedModules: Map<string, ts.ResolvedModuleFull | undefined> | undefined = (
      sourceFile as unknown as { resolvedModules?: Map<string, ts.ResolvedModuleFull | undefined> }
    ).resolvedModules;

    resolvedModules?.forEach((resolved) => {
      if (!resolved || !resolved.resolvedFileName) {
        return;
      }
      const normalized = path.normalize(resolved.resolvedFileName);
      if (inboundCounts.has(normalized)) {
        inboundCounts.set(normalized, (inboundCounts.get(normalized) ?? 0) + 1);
      }
    });
  }

  const unreferenced: DeadCodeCandidate[] = [];

  inboundCounts.forEach((count, fileName) => {
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile || sourceFile.isDeclarationFile) {
      return;
    }

    if (hasKeepAnnotation(sourceFile)) {
      return;
    }

    const relativePath = path.relative(projectRoot, fileName);
    if (
      relativePath.includes("__tests__") ||
      relativePath.includes(".test.") ||
      relativePath.includes(".spec.")
    ) {
      return;
    }

    const bundlerMarkedUnused = bundlerHints.has(fileName) || bundlerHints.has(relativePath);
    if (count === 0 || bundlerMarkedUnused) {
      const owner = resolveOwner(relativePath, ownerPatterns);
      unreferenced.push({
        type: "unreferenced-module",
        file: relativePath,
        reason: bundlerMarkedUnused
          ? "Bundler reports mark this module as unused."
          : "No inbound imports detected by the TypeScript module graph.",
        confidence: "high",
        owner,
      });
    }
  });

  return unreferenced;
}

function isEligibleSource(fileName: string): boolean {
  const normalized = path.normalize(fileName);
  const isSourceFile = /\.(ts|tsx|js|jsx)$/.test(normalized) && !normalized.endsWith(".d.ts");
  const excluded =
    normalized.includes("node_modules") ||
    normalized.includes("/dist/") ||
    normalized.includes("/build/") ||
    normalized.includes("/.turbo/");
  return isSourceFile && !excluded;
}

function main(): void {
  const config = loadTsConfig();
  const languageService = createLanguageService(config);
  const program = languageService.getProgram();

  if (!program) {
    throw new Error("Unable to create TypeScript program for analysis");
  }

  const ownerPatterns = loadCodeOwners();
  const bundlerHints = loadBundlerHints();
  const sourceFiles = program.getSourceFiles().filter((file) => isEligibleSource(file.fileName));
  const unusedExports = findUnusedExports(
    languageService,
    program.getTypeChecker(),
    sourceFiles,
    ownerPatterns
  );
  const unreferencedModules = findUnreferencedModules(
    program,
    sourceFiles,
    ownerPatterns,
    bundlerHints
  );

  const report: DeadCodeReport = {
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

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(
    `Dead-code analysis complete. Report written to ${path.relative(projectRoot, reportPath)}`
  );
  console.log(
    ` - Unused exports: ${unusedExports.length}\n - Unreferenced modules: ${unreferencedModules.length}\n - Bundler hints: ${bundlerHints.size}`
  );
}

main();
