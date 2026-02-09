# Example Locale Resource Structure

This document defines the standard organization for locale resource files in CompanyOS.

**Location**: `packages/i18n/locales/{locale}/{namespace}.json`

## File Organization

We split translations into **namespaces** to keep bundle sizes small and allow lazy loading.

| Namespace | Purpose |
| :--- | :--- |
| `common.json` | Reusable terms (Save, Cancel), error messages, date formats. |
| `auth.json` | Login, Signup, Password Reset, MFA screens. |
| `dashboard.json` | Main dashboard widgets, charts, and summaries. |
| `settings.json` | User profile, preferences, organization settings. |
| `legal.json` | Short legal disclaimers (not full documents). |

## JSON Structure Example

### `common.json`

```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search..."
  },
  "errors": {
    "unknown": "An unknown error occurred.",
    "network": "Please check your internet connection.",
    "required": "{field} is required."
  },
  "status": {
    "active": "Active",
    "pending": "Pending",
    "archived": "Archived"
  }
}

```text

### `dashboard.json`

```json
{
  "welcome": "Welcome back, {name}",
  "stats": {
    "totalUsers": "Total Users",
    "revenue": "Revenue (YTD)",
    "activeSessions": "Active Sessions"
  },
  "widgets": {
    "recentActivity": {
      "title": "Recent Activity",
      "empty": "No recent activity found."
    }
  },
  "alerts": {
    "project_limit_reached": "You have reached the project limit of {limit, number} projects."
  }
}

```text

### `auth.json`

```json
{
  "login": {
    "title": "Sign in to CompanyOS",
    "emailLabel": "Email Address",
    "passwordLabel": "Password",
    "submitButton": "Sign In",
    "forgotPassword": "Forgot password?"
  },
  "mfa": {
    "instruction": "Please enter the code sent to {phoneNumber}.",
    "resend": "Resend Code"
  }
}

```text

## Key Guidelines

1. **Nesting**: Use nesting up to 3 levels max for readability.
2. **Parameters**: Use `{paramName}` for interpolation.
3. **ICU Format**: Use ICU syntax for formatting within strings.
  * `{count, number}`
  * `{date, date, short}`
4. **Plurals**:

    ```json
    "itemsSelected": "{count, plural, =0 {No items selected} one {# item selected} other {# items selected}}"

```text
