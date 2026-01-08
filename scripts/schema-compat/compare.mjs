import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import "./types.js";

const SEMANTIC_TAG_KEYS = ["x-classification", "x-semantic", "x-tags"];

export async function loadSchemaFile(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    return yaml.load(content);
  }

  return JSON.parse(content);
}

export async function collectSchemas(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const collected = new Map();

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectSchemas(fullPath);
      for (const [relative, schema] of nested.entries()) {
        collected.set(path.join(entry.name, relative), schema);
      }
    } else if (
      entry.name.endsWith(".json") ||
      entry.name.endsWith(".yaml") ||
      entry.name.endsWith(".yml")
    ) {
      const schema = await loadSchemaFile(fullPath);
      collected.set(entry.name, schema);
    }
  }

  return collected;
}

function parseType(input) {
  if (!input) return new Set();
  return new Set(Array.isArray(input) ? input : [input]);
}

function isTypeNarrowing(baselineType, currentType) {
  const baseline = parseType(baselineType);
  const current = parseType(currentType);
  if (!baseline.size || !current.size) return false;

  const currentNotInBaseline = [...current].filter((type) => !baseline.has(type));
  const removedTypes = [...baseline].filter((type) => !current.has(type));

  // Any incompatibility (swapped or removed types) is considered narrowing/breaking.
  return currentNotInBaseline.length > 0 || removedTypes.length > 0;
}

function compareEnums(baseline, current) {
  if (!baseline || !current) return false;
  const currentSet = new Set(current.map(String));
  return baseline.some((value) => !currentSet.has(String(value)));
}

function semanticsChanged(baselineSchema, currentSchema, propertyName) {
  for (const key of SEMANTIC_TAG_KEYS) {
    const baselineTag = baselineSchema?.[key];
    const currentTag = currentSchema?.[key];
    const baselineValue = baselineTag?.[propertyName];
    const currentValue = currentTag?.[propertyName];

    if (baselineValue === undefined) continue;
    if (baselineValue !== currentValue) {
      return { changed: true, key, from: baselineValue, to: currentValue }; // explicit change or removal
    }
  }
  return { changed: false };
}

function addChange(target, file, change) {
  target.push({ ...change, file, path: change.path.replace(/^\./, "") });
}

function compareObjects(
  baseline,
  current,
  file,
  prefix = "",
  accumBreaking = [],
  accumNonBreaking = []
) {
  const baselineProps = baseline.properties ?? {};
  const currentProps = current.properties ?? {};
  const baselineRequired = new Set(baseline.required ?? []);
  const currentRequired = new Set(current.required ?? []);

  for (const requiredField of baselineRequired) {
    if (!currentRequired.has(requiredField)) {
      addChange(accumBreaking, file, {
        code: "required.removed",
        path: `${prefix}${prefix ? "." : ""}${requiredField}`,
        message: `Required field "${requiredField}" was removed or made optional in ${file}`,
        severity: "breaking",
      });
    }
  }

  for (const [propName, baselineProp] of Object.entries(baselineProps)) {
    const currentProp = currentProps[propName];
    const propPath = `${prefix}${prefix ? "." : ""}${propName}`;

    if (!currentProp) {
      if (baselineRequired.has(propName)) {
        addChange(accumBreaking, file, {
          code: "property.missing",
          path: propPath,
          message: `Property "${propName}" was removed from ${file}`,
          severity: "breaking",
        });
      }
      continue;
    }

    if (isTypeNarrowing(baselineProp.type, currentProp.type)) {
      addChange(accumBreaking, file, {
        code: "type.narrowed",
        path: propPath,
        message: `Type for "${propName}" narrowed from ${String(baselineProp.type)} to ${String(currentProp.type)} in ${file}`,
        severity: "breaking",
      });
    }

    if (compareEnums(baselineProp.enum, currentProp.enum)) {
      addChange(accumBreaking, file, {
        code: "enum.value.removed",
        path: propPath,
        message: `Enum on "${propName}" removed one or more values in ${file}`,
        severity: "breaking",
      });
    }

    const semanticChange = semanticsChanged(baseline, current, propName);
    if (semanticChange.changed) {
      addChange(accumBreaking, file, {
        code: "semantics.changed",
        path: propPath,
        message: `Semantic tag ${semanticChange.key} changed for "${propName}" (${semanticChange.from} -> ${semanticChange.to})`,
        severity: "breaking",
        details: {
          from: semanticChange.from,
          to: semanticChange.to,
          key: semanticChange.key,
        },
      });
    }

    if (baselineProp.properties && currentProp.properties) {
      compareObjects(baselineProp, currentProp, file, propPath, accumBreaking, accumNonBreaking);
    }
  }

  for (const propName of Object.keys(currentProps)) {
    if (!Object.prototype.hasOwnProperty.call(baselineProps, propName)) {
      addChange(accumNonBreaking, file, {
        code: "property.missing",
        path: `${prefix}${prefix ? "." : ""}${propName}`,
        message: `Property "${propName}" added to ${file}`,
        severity: "info",
      });
    }
  }
}

function parseSemver(version) {
  if (!version) return undefined;
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return undefined;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function isMajorBump(baseline, current) {
  const baselineSemver = parseSemver(baseline);
  const currentSemver = parseSemver(current);
  if (!baselineSemver || !currentSemver) return false;
  return currentSemver.major > baselineSemver.major;
}

function markAllowed(changes, compatibility, versionBumps) {
  const allowIndex = new Map();

  for (const entry of compatibility?.allow ?? []) {
    const fileKey = entry.file ?? "*";
    allowIndex.set(`${entry.code}:${fileKey}:${entry.path}`, entry);
  }

  return changes.map((change) => {
    const candidateKeys = [
      `${change.code}:${change.file ?? "*"}:${change.path}`,
      `${change.code}:*:${change.path}`,
    ];

    for (const key of candidateKeys) {
      if (allowIndex.has(key)) {
        const allow = allowIndex.get(key);
        return {
          ...change,
          allowed: true,
          details: {
            ...change.details,
            allowedBy: "compatibility-map",
            rationale: allow?.rationale,
          },
        };
      }
    }

    if (change.file && versionBumps.has(change.file)) {
      return {
        ...change,
        allowed: true,
        details: { ...change.details, allowedBy: "major-version" },
      };
    }

    return change;
  });
}

export function diffSchemas(file, baseline, current) {
  const breaking = [];
  const nonBreaking = [];
  compareObjects(baseline, current, file, "", breaking, nonBreaking);
  return {
    file,
    breaking,
    nonBreaking,
    version: current["x-version"],
    baselineVersion: baseline["x-version"],
  };
}

export async function compareDirectories(options) {
  const baselineSchemas = await collectSchemas(options.baselineDir);
  const currentSchemas = await collectSchemas(options.currentDir);
  const breaking = [];
  const nonBreaking = [];
  const results = [];
  const versionBumps = new Set();

  for (const [file, baselineSchema] of baselineSchemas.entries()) {
    const currentSchema = currentSchemas.get(file);
    if (!currentSchema) {
      breaking.push({
        code: "property.missing",
        path: file,
        message: `${file} missing from current schemas`,
        severity: "breaking",
        file,
      });
      continue;
    }

    const result = diffSchemas(file, baselineSchema, currentSchema);
    results.push(result);
    breaking.push(...result.breaking);
    nonBreaking.push(...result.nonBreaking);

    if (isMajorBump(result.baselineVersion, result.version)) {
      versionBumps.add(file);
    }
  }

  const allowed = markAllowed(breaking, options.compatibility, versionBumps);
  const finalUnresolved = allowed.filter(
    (change) => change.severity === "breaking" && !change.allowed
  );
  const finalAllowed = allowed.filter((change) => change.allowed);

  return {
    breaking: allowed,
    nonBreaking,
    results,
    versionBumped: versionBumps.size > 0,
    unresolved: finalUnresolved,
    allowed: finalAllowed,
  };
}
