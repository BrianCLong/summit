# Google Workspace Connector OAuth2 (PKCE)

This guide walks through authorizing a Google Workspace connector using the
PKCE authorization code flow and validating consent/lineage metadata.

## 1) Authorize the connector

1. Configure the connector with your `clientId` and `redirectUri`.
2. Use the PKCE authorization URL generator to start the consent flow.
3. Complete the Google consent screen and capture the returned `code`.

## 2) Set least-privilege scopes

The connector defaults to the following read-only scopes:

- `https://www.googleapis.com/auth/admin.directory.user.readonly`
- `https://www.googleapis.com/auth/admin.directory.group.readonly`
- `https://www.googleapis.com/auth/admin.directory.orgunit.readonly`

If you need to expand access, add scopes explicitly and document the reason.

## 3) Validate consent metadata

Ensure your connector configuration supplies consent details:

- `consent.status` (for example, `granted`)
- `consent.scopes` (the final set of approved scopes)
- `termsUrl` (link to the terms the user agreed to)

These values are stamped into the ingestion lineage for each record.

## 4) Refresh rotation

When the access token expires, the connector refreshes it using the stored
refresh token. If the provider issues a new refresh token, the vault rotates it
and timestamps the rotation.

## 5) Review lineage

Inspect provenance/lineage entries to confirm each ingested record contains
consent metadata and the `termsUrl` reference for auditability.
