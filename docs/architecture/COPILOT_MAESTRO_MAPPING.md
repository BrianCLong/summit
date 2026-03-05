# Copilot CLI to Maestro Integration Mapping

**Date:** 2026-02-28
**Status:** Draft

## 1. Overview

This document outlines the architectural mapping between the terminal-native GitHub Copilot CLI workflow and Summit's Maestro Conductor / Operator CLI. It details how the developer-centric Copilot experience translates into production-grade orchestration and governance within the Summit platform.

## 2. Core Philosophy: The Terminal as Control Plane

Both Copilot CLI and Maestro Conductor treat the terminal as the primary control plane for defining, executing, and observing complex tasks.

* **Copilot CLI (Developer Context):** Translates human intent into executable plans, code diffs, and PR submissions.
* **Maestro Conductor (Platform Context):** Translates workflow definitions (DAGs) into distributed execution, retries, policy enforcement, and observability.

## 3. Workflow Mapping

### 3.1. Intent to Execution

| Capability | Copilot CLI (Dev Workflow) | Maestro Conductor (Platform Workflow) |
| :--- | :--- | :--- |
| **Intent Definition** | Natural language prompts (`/plan Add OAuth2 auth`) | Directed Acyclic Graphs (DAGs) defining job sequences |
| **Planning Phase** | Copilot generates a step-by-step plan for human review | Maestro validates the DAG against policy constraints and available resources |
| **Execution** | Iterative code generation, test running, and local builds | Distributed job execution across the microservices architecture |
| **Output Artifact** | A cohesive Pull Request (PR) with generated diffs | State transitions recorded in IntelGraph, workflow status updates |

### 3.2. CI Debugging and Infrastructure Operations

The integration leverages the Copilot CLI's ability to interpret terminal output to accelerate Maestro-related operations.

* **CI Debugging:** When a Maestro-orchestrated CI pipeline fails, developers can pipe the logs into Copilot CLI (e.g., `cat maestro_run.log | copilot explain "Why did the pipeline fail?"`). Copilot can analyze the specific failure within the context of the repository's rules.
* **Infrastructure Automation:** Copilot CLI can assist in generating infrastructure-as-code (Terraform, Kubernetes manifests) that the Maestro operator CLI subsequently deploys and manages.

## 4. Governance and Permissions

A critical aspect of this integration is maintaining security and compliance when agentic tools execute commands.

* **Tool Permissions (Copilot CLI):** The `.github/copilot-instructions.md` explicitly restricts the Copilot CLI's capabilities (e.g., allowing specific `pnpm` or `git` commands, but denying arbitrary system changes without confirmation).
* **Execution Policies (Maestro):** Maestro enforces runtime policies (e.g., resource limits, authorization checks via OPA) regardless of how the workflow was initiated (human or AI-assisted).

## 5. Future State: Copilot as Maestro Client

The long-term vision involves a deeper integration where Copilot CLI acts as an intelligent client for Maestro.

* **Scenario:** A developer uses Copilot CLI to provision a new ingestion pipeline.
* **Action:** Copilot generates the required connector configuration and automatically interacts with the Maestro operator CLI (`maestro apply pipeline.yml`) to register and start the workflow.
