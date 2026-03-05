# P1: MTWGL Foundation & Hierarchy

You are building the foundation of the Multi-Tenant Workspace & Tenant Governance Layer (MTWGL) for Summit.

**Goal:** Establish the enterprise hierarchy: `Organization -> Tenant -> Workspace -> Project/Agent`.

**Constraints:**
- Target "few big enterprises" (deep compliance, slower complexity growth).
- Update the existing TenantContext to include this full hierarchy.
- Provide database schema definitions or TypeScript interfaces mapping this hierarchy.
- Ensure that ACP, AEGS, TMAML, and ASF models are explicitly updated to reference a `workspaceId` and `tenantId`.

**Deliverables:**
- Define the data model for Orgs, Tenants, Workspaces, and Projects.
- Define how identity and ownership flow down this hierarchy.
- Write tests to validate the creation of these entities without collision.
