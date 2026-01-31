# Board Packet

This document describes the board packet, which provides a comprehensive overview of the assurance graph.

## 1. Overview

The board packet is a JSON file that contains the executive summary, drift anomaly report, and the assurance graph.

## 2. Schema

The board packet must validate against the [board_packet.schema.json](schemas/reporting/board_packet.schema.json).

## 3. Fields

| Field               | Type      | Description                               |
| ------------------- | --------- | ----------------------------------------- |
| `executive_summary` | `object`  | The executive summary.                    |
| `drift_anomalies`   | `array`   | The drift anomaly report.                 |
| `assurance_graph`   | `object`  | The assurance graph.                      |
