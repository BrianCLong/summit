# 🚀 n8n Automation Quick Setup Guide

## ⚡ 5-Minute Setup Checklist

> [!CAUTION]
> **SECURITY MANDATE:** If you are self-hosting n8n, you **MUST** use version **1.121.0** or later to protect against the **CVE-2026-21858 (Ni8mare)** critical RCE vulnerability.

This guide will get your n8n automation workflows operational in under 5 minutes.

### Step 1: Configure API Credentials (5 minutes)

#### GitHub Personal Access Token

1. Navigate to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `n8n-automation`
4. Expiration: `90 days` (or No expiration)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
   - ✅ `admin:org` (Full control of orgs and teams)
   - ✅ `project` (Full control of projects)
   - ✅ `write:discussion` (Write team discussions)
6. Click "Generate token"
7. **COPY THE TOKEN** (you won't see it again)

#### Add to n8n:
1. Go to: https://topicality.app.n8n.cloud
2. Click your profile → Credentials
3. Click "Add Credential"
4. Search for "GitHub"
5. Select "GitHub OAuth2 API" or "GitHub API"
6. Name: `GitHub account 2`
7. Paste your token
8. Click "Save"

#### Groq API Key

1. Navigate to: https://console.groq.com/keys
2. Click "Create API Key"
3. Name: `n8n-summit-automation`
4. Click "Submit"
5. **COPY THE API KEY**

#### Add to n8n:
1. Go to: https://topicality.app.n8n.cloud
2. Click your profile → Credentials
3. Click "Add Credential"
4. Search for "Groq"
5. Name: `Groq account`
6. Paste your API key
7. Click "Save"

### Step 2: Set Up GitHub Webhooks (2 minutes)

#### For Issue→Deploy Pipeline:

1. Go to: https://github.com/TopicalityLLC/Summit/settings/hooks
2. Click "Add webhook"
3. **Payload URL**: `https://topicality.app.n8n.cloud/webhook/97be927c-3970-4cf7-8f91-c2e1706698c7`
4. **Content type**: `application/json`
5. **Secret**: (leave empty for now)
6. **Which events?**: Select individual events:
   - ✅ Issues
   - ✅ Issue comments
7. ✅ Active
8. Click "Add webhook"

#### For PR Review Swarm:

1. Same location: https://github.com/TopicalityLLC/Summit/settings/hooks
2. Click "Add webhook"
3. **Payload URL**: `https://topicality.app.n8n.cloud/webhook/3aacf6a8-99fc-48be-a015-d312a835cdf8`
4. **Content type**: `application/json`
5. **Which events?**: Select:
   - ✅ Pull requests
   - ✅ Pull request reviews
   - ✅ Pull request review comments
6. ✅ Active
7. Click "Add webhook"

### Step 3: Test Your Workflows (3 minutes)

#### Test Issue→Deploy Pipeline:

1. Go to: https://github.com/TopicalityLLC/Summit/issues/new
2. Title: `[TEST] Fix typo in README`
3. Body:
```
There's a typo in the README.md file on line 5.
The word "developement" should be "development".

Please fix this typo.
```
4. Click "Submit new issue"
5. Watch the workflow execute in n8n: https://topicality.app.n8n.cloud/executions
6. Check if the AI responds with a solution

#### Test Summit Dev Agent:

1. Go to: https://topicality.app.n8n.cloud/workflow/GuhlslGOggJENXUA
2. Click "Execute workflow" button
3. Watch it run
4. Check execution logs for results

### Step 4: Complete PR Review Swarm (30 minutes)

The PR Review Swarm workflow foundation is created. To complete it:

1. Go to: https://topicality.app.n8n.cloud/workflow/bZkiXqSArkV2Xc2I
2. Add these nodes after the GitHub "Get pull requests" node:

#### Architecture Reviewer:
- Node: **Groq Chat Model**
- Model: `llama-3.1-70b-versatile`
- System Prompt:
```
You are an expert software architect. Review this PR for:
- Architecture patterns and design decisions
- Code organization and structure
- Scalability considerations
- Maintainability concerns
- Integration points

Provide specific, actionable feedback.
```

#### Security Reviewer:
- Node: **Groq Chat Model**
- Model: `llama-3.1-70b-versatile`
- System Prompt:
```
You are a security expert. Review this PR for:
- Security vulnerabilities
- Input validation issues
- Authentication/authorization flaws
- Data exposure risks
- Injection vulnerabilities

Provide CVE references where applicable.
```

#### Performance Reviewer:
- Node: **Groq Chat Model**
- Model: `llama-3.1-70b-versatile`
- System Prompt:
```
You are a performance optimization expert. Review this PR for:
- Performance bottlenecks
- Memory usage concerns
- Database query efficiency
- Algorithm complexity
- Resource utilization

Provide benchmarking suggestions.
```

3. Add a **Merge** node to combine all three reviews
4. Add a **GitHub** node: "Create a comment on an issue"
5. Configure to post the merged review to the PR
6. Click "Save"
7. Activate the workflow

### Step 5: Monitor & Optimize (Ongoing)

#### View Execution Logs:
- Dashboard: https://topicality.app.n8n.cloud/executions
- Filter by workflow
- Check success/failure rates
- Review execution times

#### Key Metrics to Track:

**Development Velocity:**
- Issues resolved automatically
- PR review time reduction
- Code quality improvements
- Time saved per developer

**Workflow Health:**
- Execution success rate
- Average execution time
- Error frequency
- API rate limit usage

**AI Performance:**
- Groq API response times
- Model accuracy rates
- Copilot acceptance rates
- Code generation quality

## 🎯 Next Steps After Setup

### Week 1:
- ✅ Monitor workflow executions daily
- ✅ Fine-tune AI prompts based on output quality
- ✅ Document any issues or improvements
- ✅ Train team on creating AI-friendly issue descriptions

### Week 2:
- 🏗️ Build remaining workflows:
  - Issue Intelligence
  - Deploy Orchestrator
  - Quality Guardian
  - Documentation Sync
- 📊 Start collecting baseline metrics
- 🎓 Team training sessions

### Week 3:
- 🏗️ Complete additional workflows:
  - Dependency Manager
  - Test Multiplier
  - Security Scanner
  - Performance Monitor
- 📈 Analyze productivity improvements
- 📝 Document ROI for business case

### Week 4:
- 📊 Compile final metrics
- 📈 Calculate productivity multiplier
- 💼 Prepare business case presentation
- 🎯 Make purchase decision

## 🆘 Troubleshooting

### Workflow Not Triggering:
- Check webhook is active in GitHub
- Verify webhook URL matches n8n webhook URL
- Check webhook delivery in GitHub (Settings → Webhooks → Recent Deliveries)
- Ensure workflow is "Active" in n8n

### API Rate Limits:
- GitHub: 5,000 requests/hour (authenticated)
- Groq: Check your plan limits
- Solution: Add error handling and retry logic

### Credentials Not Working:
- Re-generate tokens
- Check token scopes/permissions
- Ensure tokens haven't expired
- Test with n8n's credential test function

### Workflow Errors:
- Check execution logs in n8n
- Look for error messages in nodes
- Verify data format matches expected input
- Test nodes individually with mock data

## 📞 Support Resources

- **n8n Documentation**: https://docs.n8n.io
- **n8n Community**: https://community.n8n.io
- **GitHub Docs**: https://docs.github.com/enterprise-cloud@latest
- **Groq API Docs**: https://console.groq.com/docs
- **Copilot Docs**: https://docs.github.com/copilot

## ⚡ Quick Links

- **n8n Dashboard**: https://topicality.app.n8n.cloud
- **GitHub Enterprise**: https://github.com/enterprises/topicality
- **Summit Repository**: https://github.com/TopicalityLLC/Summit
- **GitHub Webhooks**: https://github.com/TopicalityLLC/Summit/settings/hooks
- **GitHub Tokens**: https://github.com/settings/tokens
- **Groq Console**: https://console.groq.com

---

**Setup Time**: 5 minutes for credentials + 2 minutes for webhooks = **7 minutes total**
**Status**: 🟢 Ready to automate!
