#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const REQUIRED_OPENLINEAGE_MINOR = '1.44';
const REQUIRED_MARQUEZ_REPOSITORY = 'marquezproject/marquez';
const REQUIRED_OPENMETADATA_FIELDS = [
  'queryStatementSource',
  'queryParserConfig',
  'statusLookbackDays',
];
const OPTIONAL_LOCKSTEP_REQUIREMENTS = [
  { name: 'apache-airflow-providers-openlineage', expectedMinor: '2.9' },
  { name: 'openmetadata-ingestion', expectedMinor: '1.12' },
];

const failures = [];
const notices = [];

function readFileOrFail(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: required file not found`);
    return null;
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function loadYaml(relativePath) {
  const content = readFileOrFail(relativePath);
  if (content === null) {
    return null;
  }

  try {
    return yaml.load(content);
  } catch (error) {
    failures.push(`${relativePath}: invalid YAML (${error.message})`);
    return null;
  }
}

function validateOpenLineageRequirements() {
  const requirementsIn = readFileOrFail('requirements.in');
  if (requirementsIn === null) {
    return;
  }

  const lines = requirementsIn
    .split(/\r?\n/u)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  const requiredPackages = ['openlineage-python', 'openlineage-dbt'];
  const versionPattern = new RegExp(
    `==${REQUIRED_OPENLINEAGE_MINOR.replace('.', '\\.')}(?:\\.\\*|\\.\\d+)$`,
    'i'
  );

  for (const pkg of requiredPackages) {
    const match = lines.find(line =>
      line.toLowerCase().startsWith(`${pkg.toLowerCase()}==`)
    );

    if (!match) {
      failures.push(
        `requirements.in: missing pinned dependency ${pkg}==${REQUIRED_OPENLINEAGE_MINOR}.*`
      );
      continue;
    }

    if (!versionPattern.test(match)) {
      failures.push(
        `requirements.in: ${pkg} must be pinned to ${REQUIRED_OPENLINEAGE_MINOR}.x (found "${match}")`
      );
    }
  }

  for (const optionalPkg of OPTIONAL_LOCKSTEP_REQUIREMENTS) {
    const prefix = `${optionalPkg.name.toLowerCase()}==`;
    const matches = lines.filter(line => line.toLowerCase().startsWith(prefix));
    for (const match of matches) {
      const versionPattern = new RegExp(
        `==${optionalPkg.expectedMinor.replace('.', '\\.')}(?:\\.\\*|\\.\\d+)$`,
        'i'
      );
      if (!versionPattern.test(match)) {
        failures.push(
          `requirements.in: ${optionalPkg.name} must be pinned to ${optionalPkg.expectedMinor}.x when present (found "${match}")`
        );
      }
    }
  }
}

function validateImagePins() {
  const compose = loadYaml('deploy/compose/docker-compose.full.yml');
  const composeImage = compose?.services?.openlineage?.image;
  let composeTag = null;
  if (typeof composeImage === 'string') {
    const parts = composeImage.split(':');
    if (parts.length >= 2) {
      const repo = parts.slice(0, -1).join(':');
      composeTag = parts.at(-1);
      if (repo !== REQUIRED_MARQUEZ_REPOSITORY) {
        failures.push(
          `deploy/compose/docker-compose.full.yml: services.openlineage.image must use ${REQUIRED_MARQUEZ_REPOSITORY}`
        );
      }
    } else {
      failures.push(
        'deploy/compose/docker-compose.full.yml: services.openlineage.image must be explicitly tagged'
      );
    }
  }

  if (typeof composeImage === 'string' && /:latest$/iu.test(composeImage)) {
    failures.push(
      'deploy/compose/docker-compose.full.yml: services.openlineage.image must not use :latest'
    );
  }

  const k8s = loadYaml('k8s/marquez/deploy.yaml');
  const k8sImage = k8s?.spec?.template?.spec?.containers?.[0]?.image;
  let k8sTag = null;
  if (typeof k8sImage === 'string') {
    const parts = k8sImage.split(':');
    if (parts.length >= 2) {
      const repo = parts.slice(0, -1).join(':');
      k8sTag = parts.at(-1);
      if (repo !== REQUIRED_MARQUEZ_REPOSITORY) {
        failures.push(
          `k8s/marquez/deploy.yaml: container image must use ${REQUIRED_MARQUEZ_REPOSITORY}`
        );
      }
    } else {
      failures.push('k8s/marquez/deploy.yaml: container image must be explicitly tagged');
    }
  }

  if (typeof k8sImage === 'string' && /:latest$/iu.test(k8sImage)) {
    failures.push('k8s/marquez/deploy.yaml: container image must not use :latest');
  }

  const chartValues = loadYaml('charts/ig-platform/values.yaml');
  const chartRepo = chartValues?.openlineage?.image?.repository;
  const chartTag = chartValues?.openlineage?.image?.tag;
  if (typeof chartRepo === 'string' && chartRepo !== REQUIRED_MARQUEZ_REPOSITORY) {
    failures.push(
      `charts/ig-platform/values.yaml: openlineage.image.repository must be ${REQUIRED_MARQUEZ_REPOSITORY}`
    );
  }
  if (typeof chartTag === 'string' && chartTag.toLowerCase() === 'latest') {
    failures.push('charts/ig-platform/values.yaml: openlineage.image.tag must not be latest');
  }

  if (
    typeof composeTag === 'string' &&
    typeof k8sTag === 'string' &&
    typeof chartTag === 'string'
  ) {
    const normalizedChartTag = chartTag.replace(/^['"]|['"]$/gu, '');
    if (composeTag !== k8sTag || composeTag !== normalizedChartTag) {
      failures.push(
        `Marquez image tag mismatch across configs (compose=${composeTag}, k8s=${k8sTag}, chart=${normalizedChartTag})`
      );
    }
  }
}

function listCandidateConfigFiles(dirPath, files) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const skipDirs = new Set([
    '.git',
    '.archive',
    'archive',
    'dist',
    'build',
    'node_modules',
    'october2025',
  ]);

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolute = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        listCandidateConfigFiles(absolute, files);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (
      entry.name.endsWith('.yaml') ||
      entry.name.endsWith('.yml') ||
      entry.name.endsWith('.json') ||
      entry.name.endsWith('.toml')
    ) {
      files.push(absolute);
    }
  }
}

function validateOpenMetadataFieldPresence() {
  const searchRoots = ['ingestion', 'pipelines', 'airflow', 'deploy', 'charts', 'connectors'];
  const candidateFiles = [];
  for (const root of searchRoots) {
    listCandidateConfigFiles(path.join(process.cwd(), root), candidateFiles);
  }

  const openMetadataFiles = [];
  for (const absolutePath of candidateFiles.sort()) {
    const content = fs.readFileSync(absolutePath, 'utf8');
    if (/openmetadata/iu.test(content)) {
      openMetadataFiles.push({ absolutePath, content });
    }
  }

  if (openMetadataFiles.length === 0) {
    notices.push(
      'No OpenMetadata ingestion configs found in checked directories; OpenMetadata schema checks skipped.'
    );
    return;
  }

  for (const file of openMetadataFiles) {
    const missing = REQUIRED_OPENMETADATA_FIELDS.filter(
      field => !new RegExp(`\\b${field}\\b`, 'u').test(file.content)
    );

    if (missing.length > 0) {
      const relativePath = path.relative(process.cwd(), file.absolutePath);
      failures.push(
        `${relativePath}: missing OpenMetadata 1.12 required fields (${missing.join(', ')})`
      );
    }
  }
}

function main() {
  validateOpenLineageRequirements();
  validateImagePins();
  validateOpenMetadataFieldPresence();

  for (const notice of notices) {
    console.log(`[lineage-lockstep] NOTICE: ${notice}`);
  }

  if (failures.length > 0) {
    console.error('[lineage-lockstep] FAIL');
    for (const failure of failures.sort()) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log('[lineage-lockstep] PASS: lineage stack lockstep checks passed.');
}

main();
