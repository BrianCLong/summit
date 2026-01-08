# n8n Activation Guide

## Critical: Activate n8n Workflows

### Current Status

✅ GitHub webhooks configured
✅ GitHub Actions workflow created
✅ Repository secrets set
✅ Documentation complete
❌ **n8n workflows need activation** ← ACTION REQUIRED

### Issue

Webhook deliveries are failing with 404 errors because the n8n workflows haven't been activated yet.

## Activation Steps

### 1. Sign into n8n

1. Go to: https://topicality.app.n8n.cloud/signin
2. Sign in with your credentials
3. Navigate to Workflows dashboard

### 2. Locate the Workflows

Find these two workflows that correspond to the configured webhooks:

**Issue Pipeline Webhook**

- URL: `https://topicality.app.n8n.cloud/webhook-test/97be927c-3970-4cf7-8f91-c2e1706698c7`
- Events: Issues (opened, edited, deleted, transferred, pinned, unpinned, closed, reopened, assigned, unassigned, labeled, unlabeled, milestoned, demilestoned), Issue comments (created, edited, deleted)

**PR Swarm Webhook**

- URL: `https://topicality.app.n8n.cloud/webhook-test/d3f5b8e1-4a7c-4829-9f02-1b5e6c7d8e9f`
- Events: Pull requests (opened, edited, closed, assigned, unassigned, review requested, review request removed, labeled, unlabeled, synchronized, converted to draft, ready for review, locked, unlocked, reopened), Pull request reviews (submitted, edited, dismissed), Pull request review comments (created, edited, deleted)

### 3. Activate Each Workflow

For each workflow:

1. Open the workflow in n8n editor
2. Verify the webhook node configuration matches the URLs above
3. Click the **"Active"** toggle in the top-right corner
4. Status should change from "Inactive" to "Active"
5. The workflow will now respond to GitHub webhooks

### 4. Verify Activation

#### Test Issue Pipeline

1. Go to: https://github.com/BrianCLong/summit/issues/new
2. Create a test issue with title: "Test n8n Integration"
3. Check n8n executions: https://topicality.app.n8n.cloud/executions
4. You should see a successful execution for the issue creation event

#### Test PR Swarm

1. Create a test branch: `git checkout -b test/n8n-integration`
2. Make a small change and push
3. Open a PR on GitHub
4. Check n8n executions for PR event processing

#### Check Webhook Deliveries

1. Go to: https://github.com/BrianCLong/summit/settings/hooks
2. Click on each webhook
3. Go to "Recent Deliveries" tab
4. Latest deliveries should show **200 OK** responses instead of 404

## Workflow Architecture

### Issue Pipeline Flow

```
GitHub Issue Event
    ↓
n8n Webhook Receiver
    ↓
Event Type Router
    ↓
┌─────────────┬──────────────┬────────────┐
│   Opened    │   Comment    │   Closed   │
└─────────────┴──────────────┴────────────┘
       ↓              ↓              ↓
  Triage Logic   AI Analysis   Archive/Tag
```

### PR Swarm Flow

```
GitHub PR Event
    ↓
n8n Webhook Receiver
    ↓
Event Type Router
    ↓
┌─────────────┬──────────────┬─────────────┐
│   Opened    │   Review     │  Synchronized│
└─────────────┴──────────────┴─────────────┘
       ↓              ↓              ↓
  Auto-Review   Notification   Re-analyze
```

## Troubleshooting

### Webhook Still Shows 404

**Possible causes:**

1. Workflow not activated in n8n
2. Webhook URL mismatch
3. n8n service temporarily down

**Solutions:**

- Verify workflow is showing "Active" status in n8n
- Check webhook URLs match exactly between GitHub and n8n
- Test webhook with "Redeliver" button in Recent Deliveries

### Workflow Activated But Not Executing

**Possible causes:**

1. Webhook events not configured correctly
2. Authentication issues
3. Workflow has errors

**Solutions:**

- Check n8n execution logs for errors
- Verify webhook events match workflow expectations
- Test workflow manually with sample payload

### Executions Failing

**Check:**

1. n8n workflow error messages
2. GitHub API rate limits
3. Authentication tokens validity
4. Node configurations in workflow

## Performance Monitoring

### Key Metrics to Track

1. **Webhook Delivery Success Rate**
   - Target: >99%
   - Check: GitHub Settings → Webhooks → Recent Deliveries

2. **n8n Execution Success Rate**
   - Target: >95%
   - Check: n8n Dashboard → Executions

3. **Average Execution Time**
   - Target: <5 seconds for issue events
   - Target: <10 seconds for PR events
   - Check: n8n execution details

4. **Event Processing Latency**
   - Target: <30 seconds end-to-end
   - Measure: GitHub event timestamp → n8n completion

## Next Steps After Activation

### Immediate

1. ✅ Activate both n8n workflows
2. ✅ Test with sample issue and PR
3. ✅ Verify webhook deliveries show 200 OK
4. ✅ Monitor first few executions for errors

### Short-term (This Week)

1. Fine-tune workflow logic based on real events
2. Add error handling and retry mechanisms
3. Set up execution monitoring/alerts
4. Document workflow customization guidelines

### Long-term (This Month)

1. Expand automation to cover more event types
2. Implement ML-based issue triage
3. Build PR review intelligence
4. Create execution analytics dashboard
5. Integrate with external intelligence systems

## Workflow Enhancement Ideas

### Issue Pipeline Enhancements

- Auto-labeling based on issue content
- Sentiment analysis for priority assignment
- Duplicate issue detection
- Auto-assignment to relevant team members
- Integration with project management tools

### PR Swarm Enhancements

- Automated code review suggestions
- Test coverage analysis
- Security vulnerability scanning
- Performance impact prediction
- Auto-merge for approved PRs

## Support Resources

### Documentation

- n8n Webhook Documentation: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- GitHub Webhooks Guide: https://docs.github.com/en/webhooks
- Summit ENTERPRISE-SETUP.md: Architecture details
- Summit WORKFLOW-OPTIMIZATION.md: Performance tuning

### Quick Links

- n8n Dashboard: https://topicality.app.n8n.cloud/workflow
- GitHub Webhooks: https://github.com/BrianCLong/summit/settings/hooks
- GitHub Actions: https://github.com/BrianCLong/summit/actions
- Repository Secrets: https://github.com/BrianCLong/summit/settings/secrets/actions

## Security Notes

### Webhook Security

- SSL verification enabled by default
- Consider adding webhook secrets for additional security
- Rotate secrets periodically (every 90 days)
- Monitor unauthorized access attempts

### Authentication

- GitHub PAT has repo and workflow scopes only
- Store sensitive data in n8n credentials, not in workflows
- Never commit tokens to repository
- Use environment variables for configuration

## Maintenance Schedule

### Daily

- Monitor execution success rate
- Check for failed webhook deliveries

### Weekly

- Review execution logs for patterns
- Optimize slow-running workflows
- Update workflow logic based on usage

### Monthly

- Audit webhook configurations
- Review and rotate credentials
- Analyze performance metrics
- Plan workflow enhancements

---

**Status**: Awaiting n8n workflow activation
**Last Updated**: 2025-12-24
**Next Action**: Sign into n8n and activate workflows
