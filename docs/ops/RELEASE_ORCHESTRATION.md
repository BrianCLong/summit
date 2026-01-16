# Cross-Repo Release Orchestration

This document outlines the principles and process for orchestrating releases that span multiple products and repositories. The goal is to provide visibility and coordination for complex releases without making the individual release processes mutually blocking.

## 1. Core Principles

-   **Plan, Don't Execute**: The central orchestration process produces a *release plan*, not a series of automated actions. It provides a single source of truth for the state of a multi-product release, but the execution of that release remains with the individual Product Release Captains.
-   **Opt-In Participation**: Not all releases require orchestration. This process is designed for major, multi-product initiatives. Standard, independent releases should continue to use their existing processes.
-   **Dependency Awareness, Not Enforcement**: The orchestration process makes cross-repo dependencies explicit (e.g., `Product-A v2.1` requires `SDK-B v1.5`). It is the responsibility of the Product Release Captains to ensure these dependencies are met.

## 2. The Release Plan

The primary artifact of the orchestration process is the `release_plan.json`. This is a machine-readable document that defines the components, versions, and dependencies for a given release train.

A `portfolio_release_plan.mjs` script will be created to generate this plan.

### Example `release_plan.json`

```json
{
  "releaseName": "Summit 2026 Q1 Launch",
  "releaseDate": "2026-03-15",
  "status": "PLANNING",
  "releaseGroups": [
    {
      "name": "Product A",
      "lead": "Product Release Captain A",
      "repositories": [
        {
          "name": "summit-app",
          "version": "v3.0.0",
          "status": "ON_TRACK",
          "dependencies": [
            { "name": "common-utils", "version": "v2.1.0" },
            { "name": "intelgraph-server", "version": "v1.5.0" }
          ]
        }
      ]
    },
    {
      "name": "Platform",
      "lead": "Platform Ops Captain",
      "repositories": [
        {
          "name": "intelgraph-server",
          "version": "v1.5.0",
          "status": "AT_RISK",
          "dependencies": []
        }
      ]
    }
  ]
}
```

## 3. The Orchestration Process

1.  **Initiation**: A lead Product Release Captain initiates the process by creating a new release plan file.
2.  **Planning**: The lead captain works with other captains to define the release groups, repositories, and target versions.
3.  **Tracking**: The `portfolio_release_plan.mjs` script is run on a schedule. It ingests the `ga_status.json` from each participating repository and updates the `status` field in the `release_plan.json`.
4.  **Visualization**: The `release_plan.json` is used to generate a human-readable `RELEASE_PLAN.md` file, providing a clear dashboard for the release train.
5.  **Execution**: The individual Product Release Captains execute their own release playbooks, using the central release plan for coordination.
