# Notion Integration Setup

> **Readiness anchor:** `docs/SUMMIT_READINESS_ASSERTION.md`

## Purpose

Configure the Notion integration for issue migration by wiring the database ID, API token, and schema expectations into Summit's verification workflow.

## Required Notion Database Schema

The Issue Migration database must contain the following properties:

| Property           | Type   | Purpose                 |
| ------------------ | ------ | ----------------------- |
| **Name**           | Title  | Issue title             |
| **Status**         | Select | Issue status            |
| **Priority Level** | Select | Priority classification |
| **Text**           | Text   | Issue description       |

## Environment Variables

Set these environment variables in your local `.env` (do not commit secrets):

```bash
NOTION_API_KEY=ntn_replace_me
NOTION_DATABASE_ID=replace_with_database_id
NOTION_WORKSPACE_ID=replace_with_workspace_id
```

## Verification

Run the integration verifier to confirm token and schema alignment:

```bash
npx ts-node scripts/verify-integrations.ts notion
```

Successful verification confirms the database is reachable and the schema matches the required properties.

## Operational Notes

- Store the Notion API token in the approved secrets manager for non-local environments.
- Any schema deviations must be logged as **Governed Exceptions** with a remediation timeline.
