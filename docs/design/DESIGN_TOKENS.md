# Design Tokens

This document outlines the design tokens used in the Summit platform. Adhering to these tokens will ensure a consistent and high-quality user experience.

## Spacing

The spacing scale is based on a 4px grid. Use these tokens for margins, padding, and positioning elements.

| Token         | Value |
| ------------- | ----- |
| `spacing.xs`  | 4px   |
| `spacing.s`   | 8px   |
| `spacing.m`   | 16px  |
| `spacing.l`   | 24px  |
| `spacing.xl`  | 32px  |
| `spacing.xxl` | 48px  |

## Typography

The typography hierarchy defines the styles for all text elements.

| Token                | Font Size | Font Weight |
| -------------------- | --------- | ----------- |
| `typography.h1`      | 32px      | 700         |
| `typography.h2`      | 24px      | 700         |
| `typography.h3`      | 20px      | 700         |
| `typography.body`    | 16px      | 400         |
| `typography.caption` | 14px      | 400         |

## Colors

The color palette defines the colors used throughout the application.

### Primary Colors

| Token                 | HEX       | Usage                                   |
| --------------------- | --------- | --------------------------------------- |
| `color.primary.main`  | `#007bff` | Primary actions, links, and highlights. |
| `color.primary.light` | `#66aaff` | Lighter shades of the primary color.    |
| `color.primary.dark`  | `#0056b3` | Darker shades of the primary color.     |

### Semantic Colors

| Token           | HEX       | Usage                                 |
| --------------- | --------- | ------------------------------------- |
| `color.success` | `#28a745` | Success states and confirmations.     |
| `color.warning` | `#ffc107` | Warnings and alerts.                  |
| `color.error`   | `#dc3545` | Error states and destructive actions. |

### Greyscale

| Token            | HEX       | Usage                              |
| ---------------- | --------- | ---------------------------------- |
| `color.grey.900` | `#212529` | Headlines and primary text.        |
| `color.grey.700` | `#495057` | Secondary text and icons.          |
| `color.grey.500` | `#adb5bd` | Borders and dividers.              |
| `color.grey.300` | `#dee2e6` | Backgrounds for disabled elements. |
| `color.grey.100` | `#f8f9fa` | Page backgrounds.                  |

## Component Variants

Component variants define the styles for common UI components.

### Buttons

- **Primary**: Use for the main call to action on a page.
- **Secondary**: Use for secondary actions.
- **Danger**: Use for destructive actions.

All buttons should have consistent `hover`, `active`, `focus`, and `disabled` states.
