# Shared Tooling Plan: packages/ga-os

This document outlines the plan for the `packages/ga-os` shared tooling package. This package will be the primary mechanism for distributing and versioning the automation that underpins the federated GA Operating System.

## 1. Package Structure

The package will be a new workspace within the existing monorepo, located at `packages/ga-os`. It will be published as a private NPM package named `@summit/ga-os`.

```
packages/ga-os/
├── bin/
│   └── summit-ga-os.js   # The main executable
├── src/
│   ├── commands/
│   │   ├── init.js       # Logic for the 'init' command
│   │   └── doctor.js     # Logic for the 'doctor' command
│   ├── utils/
│   │   └── schema-validator.js
│   └── templates/        # Templates for generated files
│       ├── .ga-os.config.json.hbs
│       └── ga-os-compliance.yml.hbs
├── package.json
└── tsconfig.json
```

## 2. Core Commands

### 2.1. `summit-ga-os init`

-   **Purpose**: Bootstraps a repository for GA OS compliance.
-   **Actions**:
    1.  Prompts the user for basic configuration (e.g., project name, type).
    2.  Creates a `.ga-os.config.json` file from a template.
    3.  Injects the standard GA OS scripts (`evidence:generate`, `evidence:verify`, `ga:status`) into the root `package.json`.
    4.  Creates a `.github/workflows/ga-os-compliance.yml` file from a template.
    5.  Prints the contents of the `GA_OS_MIGRATION_GUIDE.md` to the console.

### 2.2. `summit-ga-os doctor`

-   **Purpose**: Checks a repository's compliance with the current version of the GA OS Contract.
-   **Actions**:
    1.  Reads the `.ga-os.config.json` file.
    2.  Verifies that the required scripts exist in `package.json`.
    3.  Checks that the CI workflow file is up to date with the latest template.
    4.  Validates the `ga_status.json` and `evidence_manifest.json` files against their schemas.
    5.  Provides a report of any issues and suggests remediation steps. This will be used to report on the repository's level on the Enforcement Progression Ladder.

## 3. Core Library

Beyond the CLI, the package will export a set of utility functions to be used within repository-specific scripts.

-   `generateEvidenceManifest(config)`: A function that generates the `evidence_manifest.json` file based on the repository's configuration.
-   `verifyEvidence(manifestPath)`: A function that verifies the integrity of the evidence based on a manifest file.
-   `getGAStatus(config)`: A function that returns a `ga_status.json` object.

## 4. Versioning and Distribution

-   The package will be versioned using Semantic Versioning.
-   New versions will be published to the private NPM registry.
-   The `summit-ga-os doctor` command will notify users when a new version is available.
