---
title: User Roles for Personalization
summary: Defines different user roles and their impact on personalized content.
owner: docs
---

## Roles

- **Admin**: Full access to all content and features.
- **Operator**: Access to operational guides and tools.
- **Viewer**: Read-only access to public documentation.

## Summit Price-Aware Orchestration Permissions

| Permission         | Description                                      | Roles                                       |
| ------------------ | ------------------------------------------------ | ------------------------------------------- |
| `pricing:read`     | View pricing signals and current recommendations | Admin (wildcard), Operator, Analyst, Viewer |
| `pricing:refresh`  | Trigger a pricing refresh cycle                  | Admin (wildcard), Operator                  |
| `capacity:read`    | View capacity futures inventory                  | Admin (wildcard), Operator, Analyst         |
| `capacity:reserve` | Reserve capacity futures                         | Admin (wildcard), Operator                  |
| `capacity:release` | Release reserved capacity futures                | Admin (wildcard), Operator                  |
| `flags:read`       | View feature flag states related to conductor    | Admin (wildcard), Operator                  |

> **Note:** The admin role retains the wildcard `*` permission, which includes all permissions listed above.
