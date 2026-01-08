import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

export type AttributeType = "string" | "enum" | "integer" | "object" | "array" | "boolean";

export interface AttributeDefinition {
  key: string;
  type: AttributeType;
  required?: boolean;
  allowed?: Array<string | number | boolean>;
  default?: string | number | boolean;
  description?: string;
}

export interface AttributeCatalog {
  principal?: AttributeDefinition[];
  resource?: AttributeDefinition[];
  context?: AttributeDefinition[];
}

export interface ConditionLanguage {
  syntax: string;
  description?: string;
}

export interface Grant {
  effect: "allow" | "deny";
  actions: string[];
  resources: string[];
}

export interface TemplateCondition {
  expression: string;
  based_on?: string[];
}

export interface Obligation {
  type: string;
  payload?: Record<string, unknown>;
}

export interface RoleTemplate {
  id: string;
  description: string;
  parameters?: Record<string, string>;
  grants: Grant[];
  conditions?: TemplateCondition[];
  obligations?: Obligation[];
}

export interface BindingSubject {
  type: string;
  id: string;
}

export interface Binding {
  template: string;
  with: Record<string, string | number | boolean>;
  subjects: BindingSubject[];
  conditions?: TemplateCondition[];
}

export interface AbacControl {
  expression: string;
  effect: "allow" | "deny";
  when?: string[];
}

export interface AuthorityDefinition {
  id: string;
  description: string;
  decision_strategy: "permit-overrides" | "deny-overrides" | "first-applicable";
  inherits: string[];
  bindings: Binding[];
  abac_controls?: AbacControl[];
}

export interface InheritanceRules {
  precedence?: "child-overrides" | "parent-overrides";
  merge_strategy?: {
    grants?: "append" | "replace";
    obligations?: "append" | "replace";
    conditions?: "and" | "or" | "replace";
  };
  notes?: string;
}

export interface AuthoritySchemaMetadata {
  namespace: string;
  owner: string;
  description?: string;
}

export interface AuthoritySchema {
  schema_version: string;
  metadata: AuthoritySchemaMetadata;
  attribute_catalog: AttributeCatalog;
  condition_language: ConditionLanguage;
  role_templates: RoleTemplate[];
  authorities: AuthorityDefinition[];
  inheritance_rules?: InheritanceRules;
}

export interface AuthoritySchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  schema?: AuthoritySchema;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function assertString(field: unknown, pathLabel: string, errors: string[]): void {
  if (!isNonEmptyString(field)) {
    errors.push(`${pathLabel} must be a non-empty string`);
  }
}

function assertArray(field: unknown, pathLabel: string, errors: string[]): field is unknown[] {
  if (!Array.isArray(field)) {
    errors.push(`${pathLabel} must be an array`);
    return false;
  }
  return true;
}

function validateAttributeDefinition(
  def: AttributeDefinition,
  scope: string,
  errors: string[]
): void {
  assertString(def.key, `${scope}.key`, errors);
  if (!isNonEmptyString(def.type)) {
    errors.push(`${scope}.type must be a non-empty string`);
  } else if (!["string", "enum", "integer", "object", "array", "boolean"].includes(def.type)) {
    errors.push(`${scope}.type must be one of string, enum, integer, object, array, boolean`);
  }
  if (def.type === "enum") {
    if (!def.allowed || !Array.isArray(def.allowed) || def.allowed.length === 0) {
      errors.push(`${scope}.allowed is required for enum attributes`);
    }
  }
}

function validateAttributeCatalog(catalog: AttributeCatalog, errors: string[]): void {
  const scopes: Array<keyof AttributeCatalog> = ["principal", "resource", "context"];
  scopes.forEach((scopeKey) => {
    const definitions = catalog[scopeKey];
    if (!definitions) {
      return;
    }
    if (!Array.isArray(definitions)) {
      errors.push(`attribute_catalog.${scopeKey} must be an array`);
      return;
    }
    definitions.forEach((def, index) => {
      validateAttributeDefinition(def, `attribute_catalog.${scopeKey}[${index}]`, errors);
    });
  });
}

function validateGrant(grant: Grant, scope: string, errors: string[]): void {
  if (!["allow", "deny"].includes(grant.effect)) {
    errors.push(`${scope}.effect must be allow or deny`);
  }
  if (assertArray(grant.actions, `${scope}.actions`, errors)) {
    if (grant.actions.length === 0) {
      errors.push(`${scope}.actions must include at least one action`);
    }
  }
  if (assertArray(grant.resources, `${scope}.resources`, errors)) {
    if (grant.resources.length === 0) {
      errors.push(`${scope}.resources must include at least one resource`);
    }
  }
}

function validateTemplateCondition(
  condition: TemplateCondition,
  scope: string,
  errors: string[]
): void {
  assertString(condition.expression, `${scope}.expression`, errors);
  if (condition.based_on !== undefined) {
    if (assertArray(condition.based_on, `${scope}.based_on`, errors)) {
      condition.based_on.forEach((value, idx) => {
        assertString(value, `${scope}.based_on[${idx}]`, errors);
      });
    }
  }
}

function validateRoleTemplate(template: RoleTemplate, scope: string, errors: string[]): void {
  assertString(template.id, `${scope}.id`, errors);
  assertString(template.description, `${scope}.description`, errors);
  if (!Array.isArray(template.grants) || template.grants.length === 0) {
    errors.push(`${scope}.grants must include at least one grant`);
  } else {
    template.grants.forEach((grant, index) => {
      validateGrant(grant, `${scope}.grants[${index}]`, errors);
    });
  }
  if (template.conditions) {
    if (!Array.isArray(template.conditions)) {
      errors.push(`${scope}.conditions must be an array when provided`);
    } else {
      template.conditions.forEach((condition, index) => {
        validateTemplateCondition(condition, `${scope}.conditions[${index}]`, errors);
      });
    }
  }
  if (template.obligations) {
    if (!Array.isArray(template.obligations)) {
      errors.push(`${scope}.obligations must be an array when provided`);
    } else {
      template.obligations.forEach((obligation, index) => {
        assertString(obligation.type, `${scope}.obligations[${index}].type`, errors);
      });
    }
  }
}

function validateBinding(binding: Binding, scope: string, errors: string[]): void {
  assertString(binding.template, `${scope}.template`, errors);
  if (typeof binding.with !== "object" || binding.with === null) {
    errors.push(`${scope}.with must be an object`);
  }
  if (!Array.isArray(binding.subjects) || binding.subjects.length === 0) {
    errors.push(`${scope}.subjects must include at least one subject`);
  } else {
    binding.subjects.forEach((subject, index) => {
      assertString(subject.type, `${scope}.subjects[${index}].type`, errors);
      assertString(subject.id, `${scope}.subjects[${index}].id`, errors);
    });
  }
  if (binding.conditions) {
    if (!Array.isArray(binding.conditions)) {
      errors.push(`${scope}.conditions must be an array when provided`);
    } else {
      binding.conditions.forEach((condition, index) => {
        validateTemplateCondition(condition, `${scope}.conditions[${index}]`, errors);
      });
    }
  }
}

function validateAbacControl(control: AbacControl, scope: string, errors: string[]): void {
  assertString(control.expression, `${scope}.expression`, errors);
  if (!["allow", "deny"].includes(control.effect)) {
    errors.push(`${scope}.effect must be allow or deny`);
  }
  if (control.when !== undefined) {
    if (assertArray(control.when, `${scope}.when`, errors)) {
      control.when.forEach((condition, index) => {
        assertString(condition, `${scope}.when[${index}]`, errors);
      });
    }
  }
}

function validateAuthority(authority: AuthorityDefinition, scope: string, errors: string[]): void {
  assertString(authority.id, `${scope}.id`, errors);
  assertString(authority.description, `${scope}.description`, errors);
  if (
    !["permit-overrides", "deny-overrides", "first-applicable"].includes(
      authority.decision_strategy
    )
  ) {
    errors.push(
      `${scope}.decision_strategy must be permit-overrides, deny-overrides, or first-applicable`
    );
  }
  if (!Array.isArray(authority.inherits)) {
    errors.push(`${scope}.inherits must be an array`);
  }
  if (!Array.isArray(authority.bindings) || authority.bindings.length === 0) {
    errors.push(`${scope}.bindings must include at least one binding`);
  } else {
    authority.bindings.forEach((binding, index) => {
      validateBinding(binding, `${scope}.bindings[${index}]`, errors);
    });
  }
  if (authority.abac_controls) {
    if (!Array.isArray(authority.abac_controls)) {
      errors.push(`${scope}.abac_controls must be an array when provided`);
    } else {
      authority.abac_controls.forEach((control, index) => {
        validateAbacControl(control, `${scope}.abac_controls[${index}]`, errors);
      });
    }
  }
}

function validateInheritanceRules(rules: InheritanceRules, scope: string, errors: string[]): void {
  if (rules.precedence && !["child-overrides", "parent-overrides"].includes(rules.precedence)) {
    errors.push(`${scope}.precedence must be child-overrides or parent-overrides`);
  }
  if (rules.merge_strategy) {
    const { merge_strategy: strategy } = rules;
    if (strategy.grants && !["append", "replace"].includes(strategy.grants)) {
      errors.push(`${scope}.merge_strategy.grants must be append or replace`);
    }
    if (strategy.obligations && !["append", "replace"].includes(strategy.obligations)) {
      errors.push(`${scope}.merge_strategy.obligations must be append or replace`);
    }
    if (strategy.conditions && !["and", "or", "replace"].includes(strategy.conditions)) {
      errors.push(`${scope}.merge_strategy.conditions must be and, or, or replace`);
    }
  }
}

export function validateAuthoritySchema(schemaCandidate: unknown): AuthoritySchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof schemaCandidate !== "object" || schemaCandidate === null) {
    return { valid: false, errors: ["Schema must be an object"], warnings };
  }
  const schema = schemaCandidate as AuthoritySchema;

  assertString(schema.schema_version, "schema_version", errors);
  if (!schema.metadata || typeof schema.metadata !== "object") {
    errors.push("metadata must be provided and be an object");
  } else {
    assertString(schema.metadata.namespace, "metadata.namespace", errors);
    assertString(schema.metadata.owner, "metadata.owner", errors);
    if (schema.metadata.description !== undefined) {
      assertString(schema.metadata.description, "metadata.description", errors);
    }
  }

  if (!schema.condition_language || typeof schema.condition_language !== "object") {
    errors.push("condition_language must be provided");
  } else {
    assertString(schema.condition_language.syntax, "condition_language.syntax", errors);
    if (schema.condition_language.description !== undefined) {
      assertString(schema.condition_language.description, "condition_language.description", errors);
    }
  }

  if (!schema.attribute_catalog || typeof schema.attribute_catalog !== "object") {
    errors.push("attribute_catalog must be provided and be an object");
  } else {
    validateAttributeCatalog(schema.attribute_catalog, errors);
  }

  if (!Array.isArray(schema.role_templates) || schema.role_templates.length === 0) {
    errors.push("role_templates must include at least one template");
  } else {
    schema.role_templates.forEach((template, index) => {
      validateRoleTemplate(template, `role_templates[${index}]`, errors);
    });
  }

  if (!Array.isArray(schema.authorities) || schema.authorities.length === 0) {
    errors.push("authorities must include at least one authority");
  } else {
    schema.authorities.forEach((authority, index) => {
      validateAuthority(authority, `authorities[${index}]`, errors);
    });
  }

  if (schema.inheritance_rules) {
    validateInheritanceRules(schema.inheritance_rules, "inheritance_rules", errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schema,
  };
}

export function loadAuthoritySchemaFromFile(filePath: string): AuthoritySchemaValidationResult {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    return {
      valid: false,
      errors: [`Schema file not found at ${fullPath}`],
      warnings: [],
    };
  }

  try {
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = yaml.parse(raw);
    return validateAuthoritySchema(parsed);
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to load schema: ${(error as Error).message}`],
      warnings: [],
    };
  }
}
