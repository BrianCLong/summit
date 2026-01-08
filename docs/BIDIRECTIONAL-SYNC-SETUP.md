# Bidirectional Repository Sync Setup

## Overview

This document describes the bidirectional synchronization setup between:

- **TopicalityLLC/Summit** (Enterprise Organization Repository)
- **BrianCLong/summit** (Personal Development Repository)

## Architecture

### Sync Direction 1: Personal → Enterprise

**Repository:** BrianCLong/summit  
**Workflow:** `.github/workflows/mirror-to-enterprise.yml`  
**Secret:** `ENTERPRISE_MIRROR_TOKEN`  
**Trigger:** Push to main branch or manual workflow_dispatch

### Sync Direction 2: Enterprise → Personal

**Repository:** TopicalityLLC/Summit  
**Workflow:** `.github/workflows/mirror-to-personal.yml`  
**Secret:** `PERSONAL_MIRROR_TOKEN`  
**Trigger:** Push to main branch or manual workflow_dispatch

## How It Works

1. **Development in BrianCLong/summit:**
   - Commit and push changes to BrianCLong/summit
   - Workflow automatically mirrors to TopicalityLLC/Summit
   - Enterprise repo stays in sync

2. **Updates in TopicalityLLC/Summit:**
   - Team members push to TopicalityLLC/Summit
   - Workflow automatically mirrors to BrianCLong/summit
   - Personal repo receives enterprise updates

3. **Conflict Prevention:**
   - Both workflows use `--force` push
   - Last push wins (no merge conflicts)
   - Recommended: Designate one repo as primary source of truth

## Secrets Configuration

### BrianCLong/summit Secrets

- `ENTERPRISE_MIRROR_TOKEN`: Personal Access Token with repo + workflow scopes
  - Grants write access to TopicalityLLC/Summit

### TopicalityLLC/Summit Secrets

- `PERSONAL_MIRROR_TOKEN`: Personal Access Token with repo + workflow scopes
  - Grants write access to BrianCLong/summit

## Manual Workflow Triggers

Both workflows support manual execution:

### Trigger from BrianCLong/summit:

```bash
gh workflow run mirror-to-enterprise.yml
```

### Trigger from TopicalityLLC/Summit:

```bash
gh workflow run mirror-to-personal.yml
```

Or use the GitHub Actions UI: Actions → Select Workflow → Run workflow

## Monitoring

### Check Sync Status:

1. **BrianCLong/summit:** https://github.com/BrianCLong/summit/actions
2. **TopicalityLLC/Summit:** https://github.com/TopicalityLLC/Summit/actions

### Workflow Run Details:

- View logs for each sync operation
- Check for failures or conflicts
- Verify all branches and tags synced

## Best Practices

1. **Primary Development Location:**
   - Choose one repo as primary for most development
   - Use other repo for specific enterprise/personal needs

2. **Branch Synchronization:**
   - Both workflows sync all branches
   - Feature branches mirror automatically
   - Tags are preserved across repos

3. **Token Maintenance:**
   - PATs expire based on configuration
   - Regenerate and update secrets before expiration
   - Use fine-grained tokens when possible

4. **Conflict Resolution:**
   - If conflicts occur, designated primary repo takes precedence
   - Manual push to secondary repo to restore sync

## Troubleshooting

### Workflow Fails

1. Check token hasn't expired
2. Verify token has correct permissions (repo + workflow)
3. Check workflow logs for specific errors
4. Ensure secret names match workflow configuration

### Sync Out of Date

1. Manually trigger workflow from GitHub Actions UI
2. Check for failed workflow runs
3. Verify both repos accessible

### Permission Errors

1. Regenerate PAT with correct scopes
2. Update secret in repository settings
3. Re-run failed workflow

## Security Considerations

- **Never commit PATs to repository**
- Store as encrypted GitHub secrets only
- Rotate tokens periodically
- Use minimum required permissions
- Monitor workflow execution logs
- Audit access to both repositories

## Maintenance

### Token Renewal:

1. Generate new PAT before expiration
2. Update `ENTERPRISE_MIRROR_TOKEN` in BrianCLong/summit
3. Update `PERSONAL_MIRROR_TOKEN` in TopicalityLLC/Summit
4. Test sync with manual workflow trigger

### Workflow Updates:

- Both workflows located in `.github/workflows/`
- Update both if sync logic changes
- Test in feature branch before merging

## Related Documentation

- [ENTERPRISE-SETUP.md](./ENTERPRISE-SETUP.md) - Enterprise integration architecture
- [WORKFLOW-OPTIMIZATION.md](./WORKFLOW-OPTIMIZATION.md) - Performance optimization guide
- [N8N-ACTIVATION-GUIDE.md](./N8N-ACTIVATION-GUIDE.md) - Automation platform setup
