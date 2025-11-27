# Ingest Wizard & Streaming ETL Assistant

This guide explains how to use the Ingest Wizard to onboard new data sources into the IntelGraph platform.

## Introduction

The Ingest Wizard is a self-service tool that allows you to upload data, map it to the canonical entity schema, apply data handling policies, and start the ingestion process.

## Steps

1.  **Select Source:** Click the "Choose File" button to select a CSV or JSON file from your local machine.
2.  **Map Fields:** The wizard will display the headers from your file. For each header, select the corresponding field in the canonical entity schema.
3.  **Apply Policies:** Select any data handling policies you wish to apply, such as redacting sensitive information.
4.  **Preview:** The wizard will show a preview of your data after the mappings and policies have been applied.
5.  **Load:** Click the "Start Ingestion" button to begin the ingestion process. You will be able to monitor the progress of the job in real-time.

## Supported File Types

-   CSV
-   JSON
