import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import './types.js';

const SEMANTIC_TAG_KEYS = ['x-classification', 'x-semantic', 'x-tags'];

export async function loadSchemaFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
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
    } else if (entry.name.endsWith('.json') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
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

  for (const type of current) {
    if (!baseline.has(type)) {
      return true;
    }
  }

  if ([...current].every((value) => baseline.has(value)) && baseline.size > current.size) {
    return true;
  }

  return false;
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
    if (baselineTag && currentTag && baselineTag[propertyName] && currentTag[propertyName]) {
      if (baselineTag[propertyName] !== currentTag[propertyName]) {
        return { changed: true, key, from: baselineTag[propertyName], to: currentTag[propertyName] };
      }
    }
  }
  return { changed: false };
}

function addChange(target, change) {
  target.push({ ...change, path: change.path.replace(/^\./, '') });
}

function compareObjects(baseline, current, file, prefix = '', accumBreaking = [], accumNonBreaking = []) {
  const baselineProps = baseline.properties ?? {};
  const currentProps = current.properties ?? {};
  const baselineRequired = new Set(baseline.required ?? []);
  const currentRequired = new Set(current.required ?? []);

  for (const requiredField of baselineRequired) {
    if (!currentRequired.has(requiredField)) {
      addChange(accumBreaking, {
        code: 'required.removed',
        path: `${prefix}${prefix ? '.' : ''}${requiredField}`,
        message: `Required field "${requiredField}" was removed or made optional in ${file}`,
        severity: 'breaking',
      });
    }
  }

  for (const [propName, baselineProp] of Object.entries(baselineProps)) {
    const currentProp = currentProps[propName];
    const propPath = `${prefix}${prefix ? '.' : ''}${propName}`;

    if (!currentProp) {
      if (baselineRequired.has(propName)) {
        addChange(accumBreaking, {
          code: 'property.missing',
          path: propPath,
          message: `Property "${propName}" was removed from ${file}`,
          severity: 'breaking',
        });
      }
      continue;
    }

    if (isTypeNarrowing(baselineProp.type, currentProp.type)) {
      addChange(accumBreaking, {
        code: 'type.narrowed',
        path: propPath,
        message: `Type for "${propName}" narrowed from ${String(baselineProp.type)} to ${String(currentProp.type)} in ${file}`,
        severity: 'breaking',
      });
    }

    if (compareEnums(baselineProp.enum, currentProp.enum)) {
      addChange(accumBreaking, {
        code: 'enum.value.removed',
        path: propPath,
        message: `Enum on "${propName}" removed one or more values in ${file}`,
        severity: 'breaking',
      });
    }

    const semanticChange = semanticsChanged(baseline, current, propName);
    if (semanticChange.changed) {
      addChange(accumBreaking, {
        code: 'semantics.changed',
        path: propPath,
        message: `Semantic tag ${semanticChange.key} changed for "${propName}" (${semanticChange.from} -> ${semanticChange.to})`,
        severity: 'breaking',
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
      addChange(accumNonBreaking, {
        code: 'property.missing',
        path: `${prefix}${prefix ? '.' : ''}${propName}`,
        message: `Property "${propName}" added to ${file}`,
        severity: 'info',
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

function markAllowed(changes, compatibility) {
  if (!compatibility?.allow?.length) return changes;
  const allowIndex = new Map();
  for (const entry of compatibility.allow) {
    allowIndex.set(`${entry.code}:${entry.path}`, entry);
  }

  return changes.map((change) => {
    const key = `${change.code}:${change.path}`;
    if (allowIndex.has(key)) {
      return { ...change, allowed: true, details: { ...change.details, rationale: allowIndex.get(key)?.rationale } };
    }
    return change;
  });
}

export function diffSchemas(file, baseline, current) {
  const breaking = [];
  const nonBreaking = [];
  compareObjects(baseline, current, file, '', breaking, nonBreaking);
  return {
    file,
    breaking,
    nonBreaking,
    version: current['x-version'],
    baselineVersion: baseline['x-version'],
  };
}

export async function compareDirectories(options) {
  const baselineSchemas = await collectSchemas(options.baselineDir);
  const currentSchemas = await collectSchemas(options.currentDir);
  const breaking = [];
  const nonBreaking = [];
  const results = [];
  let versionBumped = false;

  for (const [file, baselineSchema] of baselineSchemas.entries()) {
    const currentSchema = currentSchemas.get(file);
    if (!currentSchema) {
      breaking.push({
        code: 'property.missing',
        path: file,
        message: `${file} missing from current schemas`,
        severity: 'breaking',
      });
      continue;
    }

    const result = diffSchemas(file, baselineSchema, currentSchema);
    results.push(result);
    breaking.push(...result.breaking);
    nonBreaking.push(...result.nonBreaking);

    versionBumped = versionBumped || isMajorBump(result.baselineVersion, result.version);
  }

  const allowed = markAllowed(breaking, options.compatibility);
  const unresolved = allowed.filter((change) => !change.allowed && change.severity === 'breaking');
  const finalBreaking = allowed;

  if (versionBumped) {
    for (const change of unresolved) {
      change.allowed = true;
    }
  }

  const finalUnresolved = finalBreaking.filter((change) => change.severity === 'breaking' && !change.allowed);
  const finalAllowed = finalBreaking.filter((change) => change.allowed);

  return {
    breaking: finalBreaking,
    nonBreaking,
    results,
    versionBumped,
    unresolved: finalUnresolved,
    allowed: finalAllowed,
  };
}
