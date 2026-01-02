# Disabled Modules

This directory contains modules that have been disabled and are not included in production builds.

## Policy

- **Disabled modules MUST have documented justification** for why they are disabled
- **Disabled modules MUST have a decision date** for either:
  - **Re-enablement** (with required work documented)
  - **Permanent removal** (scheduled deletion date)
- **Disabled modules are excluded** from CI/CD pipelines via `.github/workflows/*/testPathIgnorePatterns`
- **Disabled modules are NOT deployed** to any environment

---

## Module Status

### Model Context Protocol (MCP) Modules

#### 1. `mcp-core.disabled/`

**Name**: `@intelgraph/mcp-core`
**Version**: 2.0.0
**Description**: Shared Model Context Protocol server core with multi-tenant auth, policy, and transport adapters

**Status**: ⚠️ **DISABLED - Pending Architecture Decision**

**Reason**:
- MCP integration was explored for AI agent orchestration
- Decision pending on whether to use MCP or custom orchestration
- Code preserved for potential future use

**Dependencies**: None

**Decision Required By**: 2026-03-01
**Options**:
- ✅ Re-enable if MCP is chosen for agent orchestration (ADR required)
- ❌ Delete if custom orchestration is chosen

---

#### 2. `intelgraph-mcp.disabled/`

**Name**: `@intelgraph/intelgraph-mcp`
**Version**: 2.0.0
**Description**: IntelGraph-specific MCP server implementation

**Status**: ⚠️ **DISABLED - Depends on mcp-core**

**Reason**:
- IntelGraph-specific wrapper for MCP core
- Disabled because `mcp-core` is disabled
- Contains IntelGraph-specific MCP tools and resources

**Dependencies**:
- `@intelgraph/mcp-core` (workspace) - DISABLED

**Decision Required By**: 2026-03-01
**Options**:
- ✅ Re-enable if `mcp-core` is re-enabled
- ❌ Delete if MCP is not adopted

---

#### 3. `maestro-mcp.disabled/`

**Name**: `@intelgraph/maestro-mcp` (assumed)
**Version**: 2.0.0 (assumed)
**Description**: Maestro-specific MCP server implementation

**Status**: ⚠️ **DISABLED - Depends on mcp-core**

**Reason**:
- Maestro-specific wrapper for MCP core
- Disabled because `mcp-core` is disabled
- Contains Maestro orchestration MCP tools

**Dependencies**:
- `@intelgraph/mcp-core` (workspace) - DISABLED

**Decision Required By**: 2026-03-01
**Options**:
- ✅ Re-enable if `mcp-core` is re-enabled
- ❌ Delete if MCP is not adopted

**Action Required**: Create ADR documenting MCP vs custom orchestration decision

---

### Legacy / Experimental Modules

#### 4. `adc/`

**Name**: `@intelgraph/adc`
**Version**: 2.0.0
**Description**: Adaptive Defense Controller

**Status**: ⚠️ **DISABLED - Feature Superseded**

**Reason**:
- Original adaptive defense/anti-fraud system
- Functionality replaced by newer `adversarial-misinfo-defense-platform/`
- Code preserved for reference during migration

**Dependencies**:
- `@intelgraph/afl-store` (workspace) - DISABLED

**Decision Required By**: 2026-02-15
**Options**:
- ❌ DELETE - Migration to new platform complete
- ✅ Re-enable only if critical functionality missing in new platform

**Recommended Action**: **DELETE** (migration complete)

---

#### 5. `afl-store/`

**Name**: `@intelgraph/afl-store`
**Version**: 2.0.0 (assumed)
**Description**: Anti-Fraud Layer data store

**Status**: ⚠️ **DISABLED - Feature Superseded**

**Reason**:
- Data store for legacy ADC (Adaptive Defense Controller)
- Dependency of `adc/`
- Superseded by new platform storage

**Dependencies**: None

**Decision Required By**: 2026-02-15
**Options**:
- ❌ DELETE - No longer needed after ADC removal

**Recommended Action**: **DELETE** (dependent module marked for deletion)

---

#### 6. `atl/`

**Name**: `@intelgraph/atl` (assumed)
**Version**: 2.0.0 (assumed)
**Description**: Unknown - requires investigation

**Status**: ⚠️ **DISABLED - Unknown**

**Reason**: Unknown - needs investigation

**Dependencies**: Unknown

**Decision Required By**: 2026-01-31
**Action Required**:
1. Investigate purpose of module
2. Check git history for why it was disabled
3. Document reason and make keep/delete decision

---

#### 7. `cfa-tdw/`

**Name**: `@intelgraph/cfa-tdw` (assumed)
**Version**: 2.0.0 (assumed)
**Description**: Unknown - requires investigation

**Status**: ⚠️ **DISABLED - Unknown**

**Reason**: Unknown - needs investigation

**Dependencies**: Unknown

**Decision Required By**: 2026-01-31
**Action Required**:
1. Investigate purpose of module
2. Check git history for why it was disabled
3. Document reason and make keep/delete decision

---

## Cleanup Schedule

| Module | Action | Scheduled Date | Owner |
|--------|--------|----------------|-------|
| `adc/` | DELETE | 2026-02-15 | Platform Engineering |
| `afl-store/` | DELETE | 2026-02-15 | Platform Engineering |
| `atl/` | INVESTIGATE → DECIDE | 2026-01-31 | Platform Engineering |
| `cfa-tdw/` | INVESTIGATE → DECIDE | 2026-01-31 | Platform Engineering |
| `mcp-core.disabled/` | DECIDE (ADR) | 2026-03-01 | Architecture Team |
| `intelgraph-mcp.disabled/` | DECIDE (depends on mcp-core) | 2026-03-01 | Architecture Team |
| `maestro-mcp.disabled/` | DECIDE (depends on mcp-core) | 2026-03-01 | Architecture Team |

---

## How to Re-enable a Module

If a disabled module needs to be re-enabled:

1. **Create ADR** documenting the decision to re-enable
2. **Move module** from `.disabled/` to appropriate location (`packages/`, `services/`, etc.)
3. **Update package.json** workspace references
4. **Fix any build issues** (dependencies may have changed)
5. **Add to CI/CD** by removing from `testPathIgnorePatterns`
6. **Write tests** to ensure functionality
7. **Update documentation**

---

## How to Permanently Delete a Module

If a disabled module is confirmed for deletion:

1. **Create ADR** documenting the decision to delete (unless already documented)
2. **Verify no dependencies** (search codebase for imports)
3. **Archive git history** (tag the commit before deletion)
   ```bash
   git tag archive/module-name-$(date +%Y%m%d) HEAD
   git push origin archive/module-name-$(date +%Y%m%d)
   ```
4. **Delete the directory**
   ```bash
   rm -rf .disabled/module-name
   ```
5. **Update this README** to remove the module entry
6. **Commit with clear message**
   ```bash
   git commit -m "chore: delete disabled module 'module-name' per ADR-XXXX"
   ```

---

## Monitoring

This README should be reviewed **quarterly** to ensure:
- Decision dates are not missed
- No disabled modules linger without justification
- Disabled modules are either re-enabled or deleted within 6 months

**Last Reviewed**: 2026-01-02
**Next Review**: 2026-04-01
**Owner**: Platform Engineering Team

---

## References

- [ADR Template](../adr/template.md)
- [Module Lifecycle Policy](../docs/governance/module-lifecycle.md)
- [Workspace Management](../docs/development/workspace-management.md)
