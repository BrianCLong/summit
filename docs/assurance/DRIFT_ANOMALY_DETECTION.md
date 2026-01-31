# Drift Anomaly Detection

This document describes the process for detecting anomalies in policy drift reports.

## 1. Overview

The drift anomaly detection process is a script that analyzes policy drift reports and identifies anomalies.

## 2. Schema

The anomaly report must validate against the [drift_anomaly_report.schema.json](schemas/assurance/drift_anomaly_report.schema.json).

## 3. Fields

| Field   | Type     | Description                               |
| ------- | -------- | ----------------------------------------- |
| `repo`    | `string` | The repository with the anomaly.          |
| `reason`  | `string` | The reason for the anomaly.               |
| `drift`   | `array`  | The list of drifted files.                |
