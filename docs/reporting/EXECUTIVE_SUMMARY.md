# Executive Summary

This document describes the executive summary report, which provides a high-level overview of the assurance graph.

## 1. Overview

The executive summary report is a JSON file that contains a summary of the entities in the assurance graph.

## 2. Schema

The report must validate against the [executive_summary.schema.json](schemas/reporting/executive_summary.schema.json).

## 3. Fields

| Field               | Type      | Description                               |
| ------------------- | --------- | ----------------------------------------- |
| `total_repos`       | `integer` | The total number of repositories.         |
| `total_releases`    | `integer` | The total number of releases.             |
| `total_artifacts`   | `integer` | The total number of artifacts.            |
| `total_controls`    | `integer` | The total number of controls.             |
| `total_exceptions`  | `integer` | The total number of exceptions.           |
| `total_incidents`   | `integer` | The total number of incidents.            |
| `total_slos`        | `integer` | The total number of SLOs.                 |
| `total_customers`   | `integer` | The total number of customers.            |
| `total_deployments` | `integer` | The total number of deployments.          |
