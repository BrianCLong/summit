# Summit Portfolio Operating Model

This document defines the federated operating model for managing the General Availability (GA) process across the Summit product portfolio. It establishes clear roles, responsibilities, and principles to ensure local autonomy, global standards, and portfolio-wide visibility.

## 1. Core Principles

- **Local Autonomy with Global Standards:** Each repository team maintains ownership of their development and release process. They adopt a minimal set of portfolio-wide standards (the "GA OS Contract") to ensure consistency and enable automation.
- **Portfolio Visibility without Portfolio Fragility:** The central Platform Ops team aggregates standarized, repo-level data to provide portfolio-wide visibility. The system is designed to be resilient; a failure in one repository's reporting does not block others.
- **Shared Tooling via Versioned Packages:** Common automation, scripts, and checks are distributed as versioned packages (e.g., an `npm` package). This avoids copy-pasting and ensures that all teams are using tested and approved tooling. Upgrades are managed and opt-in.

## 2. Roles and Responsibilities

### 2.1. Product Release Captain (Per-Product)

The Product Release Captain is the single point of contact and owner for a specific product's General Availability release.

**Responsibilities:**
- Owns the product's Go/No-Go decision for a GA release.
- Maintains the product's **Claim Ledger**, documenting all public-facing claims and mapping them to verifiable evidence.
- Owns the final **GA Evidence Packet** for their product, ensuring it is complete, accurate, and meets the standards defined in the GA OS Contract.
- Coordinates with Repo Maintainers to ensure all components are ready for the release.
- Communicates release status to the Platform Ops Captain and other stakeholders.

### 2.2. Platform Ops Captain (Portfolio-wide)

The Platform Ops Captain is responsible for the health and evolution of the federated GA Operating System itself.

**Responsibilities:**
- Owns and maintains the shared `summit-ga-os` tooling package.
- Manages the **GA OS Contract**, including any version updates and migrations.
- Develops and maintains the **Portfolio Dashboard**, aggregating status from all participating repositories.
- Defines and manages the **Enforcement Progression Ladder**, guiding teams from initial adoption to full compliance.
- Acts as a consultant to Product Release Captains and Repo Maintainers on GA OS best practices.

### 2.3. Repo Maintainers (Per-Repo)

Repo Maintainers are the owners of the codebase and CI/CD pipeline for a specific repository (which may contain one or more components).

**Responsibilities:**
- Ensures their repository's merge train is healthy and CI is reliable.
- Implements and maintains the GA OS Contract within their repository's CI/CD pipeline (e.g., adding the `evidence:generate` and `evidence:verify` commands).
- Triages and resolves any CI failures related to the GA OS tooling.
- Produces the standardized `ga_status.json` and `evidence_manifest.json` artifacts as required by the contract.
- Works with their Product Release Captain to ensure their component's evidence is ready for a release.
