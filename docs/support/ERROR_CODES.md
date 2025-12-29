# Error Codes

| Code               | HTTP Status | Message                         | Notes                                                                                                                                                            |
| ------------------ | ----------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STEP_UP_REQUIRED` | 403         | Step-up authentication required | Returned when the step-up guard denies dangerous actions because no recent strong authentication is present. Controlled by `STEP_UP_GUARD_ENABLED` feature flag. |
