# Entitlement Object Model

This document defines the core objects and their relationships for the CompanyOS's entitlement and access review system. The model is designed to be flexible and extensible, supporting a variety of access control patterns.

## 1. Core Concepts

The model is based on four primary concepts:

- **Principals**: Who can have access.
- **Entitlements**: What they can do.
- **Resources**: What they can do it to.
- **Assignments**: How access is granted.

## 2. Object Definitions

### 2.1. Principals

Principals are the actors in the system that can be granted access.

- **User**: An individual human user.
  - `id`: Unique identifier (e.g., UUID, email).
  - `attributes`: Key-value pairs describing the user (e.g., `department`, `job_title`).
- **Group**: A collection of Users and/or other Groups.
  - `id`: Unique identifier.
  - `members`: A list of User and/or Group IDs.
- **Service Account**: A non-human actor, such as an application or service.
  - `id`: Unique identifier.
  - `description`: A human-readable description of the service account's purpose.
- **Tenant**: A logical grouping of Principals and Resources, representing a customer or organizational unit.
  - `id`: Unique identifier.
  - `name`: The name of the tenant.

### 2.2. Entitlements

Entitlements represent the specific permissions and roles that can be granted.

- **Permission**: The most granular unit of access, representing a single action that can be performed on a Resource.
  - `id`: Unique identifier (e.g., `investigation:create`, `entity:delete`).
  - `description`: A human-readable description of the permission.
- **Role**: A collection of Permissions.
  - `id`: Unique identifier (e.g., `analyst`, `administrator`).
  - `permissions`: A list of Permission IDs.
- **Policy**: A set of rules that govern access, often expressed in a policy language like Rego (for OPA).
  - `id`: Unique identifier.
  - `rules`: The policy rules.

### 2.3. Resources

Resources are the objects within the CompanyOS to which access is controlled.

- **Resource Type**: A category of Resource (e.g., `Investigation`, `Entity`, `Report`).
- **Resource Instance**: A specific instance of a Resource Type (e.g., `Investigation{id:123}`).
- **Resource Scope**: A way to group Resources, often used for hierarchical access control (e.g., a `Tenant` can be a Resource Scope).

### 2.4. Assignments

Assignments create the link between Principals, Entitlements, and Resources.

- **Direct Assignment**: A direct grant of an Entitlement to a Principal for a specific Resource or Resource Scope.
  - `principal_id`: The ID of the User, Group, or Service Account.
  - `entitlement_id`: The ID of the Permission or Role.
  - `resource_id`: The ID of the Resource Instance or Resource Scope.
- **Inherited Assignment**: Access that is granted implicitly through Group membership or resource hierarchy.

## 3. Joiner/Mover/Leaver Patterns

The Entitlement Object Model must account for changes in a Principal's status.

- **Joiner**: When a new User joins the organization, they should be assigned a default set of Entitlements based on their role and team.
- **Mover**: When a User changes roles or teams, their Entitlements should be reviewed and updated to reflect their new responsibilities. Old, unneeded access should be revoked.
- **Leaver**: When a User leaves the organization, all of their access should be immediately and automatically revoked.

## 4. Example

A User with the `analyst` Role in the `alpha` Tenant.

- **Principal**: `User{id: 'user@example.com'}`
- **Entitlement**: `Role{id: 'analyst', permissions: ['investigation:create', 'investigation:read', 'entity:create']}`
- **Resource Scope**: `Tenant{id: 'alpha'}`
- **Assignment**: A direct assignment links the User, Role, and Tenant.
