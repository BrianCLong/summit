import fs from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import yaml from 'js-yaml';

import {
  type PolicyDocument,
  type SkillSpec,
  validatePolicySemantics,
} from '../../summit/agents/policy/validate-semantics.ts';

interface SkillRegistryDocument {
  skills: SkillSpec[];
}

function readYamlFile<T>(filePath: string): T {
  const contents = fs.readFileSync(filePath, 'utf8');
  return yaml.load(contents) as T;
}

function loadSkillRegistry(filePath: string): Record<string, SkillSpec> {
  const registryDoc = readYamlFile<SkillRegistryDocument>(filePath);
  return Object.fromEntries(
    registryDoc.skills.map((skill) => [skill.name, skill]),
  );
}

function validateSchema(policy: unknown, schemaPath: string): string[] {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(policy);

  if (valid) {
    return [];
  }

  return (validate.errors ?? []).map(
    (error) =>
      `SCHEMA_VALIDATION_ERROR ${error.instancePath || '/'} ${error.message}`,
  );
}

function main(): void {
  const root = process.cwd();
  const policyPath = path.join(root, 'summit/agents/policy/policy.yml');
  const schemaPath = path.join(root, 'summit/agents/policy/schema.json');
  const skillsPath = path.join(root, 'summit/agents/skills/registry.yml');

  const policy = readYamlFile<PolicyDocument>(policyPath);
  const schemaErrors = validateSchema(policy, schemaPath);
  const skillRegistry = loadSkillRegistry(skillsPath);
  const semanticResult = validatePolicySemantics(policy, skillRegistry);

  const semanticErrors = semanticResult.errors.map(
    (error) =>
      `${error.code}${error.rule_id ? ` (${error.rule_id})` : ''}: ${error.message}`,
  );

  const allErrors = [...schemaErrors, ...semanticErrors];

  if (allErrors.length > 0) {
    console.error('Policy validation failed:');
    for (const error of allErrors) {
      console.error(` - ${error}`);
    }
    process.exit(1);
  }

  console.log('Policy validation passed.');
}

main();
