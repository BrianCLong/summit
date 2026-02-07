# LUSPO RLVR Length Bias Data Handling

## Data Classes
* **Prompts/Responses**: Potentially sensitive. Must not be logged by default.
* **Rewards/Advantages**: Derived; treat as sensitive when tied to user data.
* **Lengths**: Safe metadata; can be logged.
* **Aggregated Metrics**: Safe; preferred for storage.

## Never-Log List
* Raw prompts
* Raw responses
* API keys or tokens
* User identifiers
* Emails or phone numbers

## Retention Policy
* Default retention: aggregated metrics only.
* Raw logs are opt-in and user-managed.

## Redaction Rules
* Replace never-log keys with `[REDACTED]` prior to artifact generation.
* Apply PII pattern redaction to remaining string fields.
