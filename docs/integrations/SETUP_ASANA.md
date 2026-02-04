# Asana Integration Setup

## Overview
This guide covers the complete setup process for integrating Asana with Summit, including OAuth configuration, API access, webhook setup, and data synchronization.

## Prerequisites
- Asana account (Basic, Premium, Business, or Enterprise)
- Admin access to Asana workspace
- Summit deployment with webhook endpoint capability
- Valid SSL certificate for webhook endpoints

## Phase 1: Initial Setup

### 1.1 Create Asana App
1. Navigate to https://app.asana.com/0/developer-console
2. Click "Create New App"
3. Fill in app details:
   - **App Name**: Summit Integration
   - **Description**: Agentic AI workflow orchestration platform
   - **Redirect URL**: `https://your-domain.com/auth/asana/callback`
   - **Webhook URL**: `https://your-domain.com/webhooks/asana`

### 1.2 OAuth 2.0 Configuration
1. Note your credentials:
   ```
   CLIENT_ID: [Your Client ID]
   CLIENT_SECRET: [Your Client Secret]
   ```
2. Configure OAuth scopes:
   - `default` - Basic read/write access
   - `openid` - User identification
   - `email` - User email access
   - `profile` - User profile information

### 1.3 Personal Access Token (Alternative)
For server-to-server integration:
1. Go to My Profile Settings → Apps → Personal Access Tokens
2. Click "Create New Token"
3. Store securely: `ASANA_ACCESS_TOKEN=1/[your_token]`

## Phase 2: Environment Configuration

### 2.1 Environment Variables
Add to your `.env` file:
```bash
# Asana OAuth
ASANA_CLIENT_ID=your_client_id
ASANA_CLIENT_SECRET=your_client_secret
ASANA_REDIRECT_URI=https://your-domain.com/auth/asana/callback

# Asana API
ASANA_ACCESS_TOKEN=1/your_token
ASANA_WORKSPACE_GID=your_workspace_gid
ASANA_WEBHOOK_SECRET=your_webhook_secret

# Asana Settings
ASANA_API_BASE_URL=https://app.asana.com/api/1.0
ASANA_RATE_LIMIT=1500
ASANA_SYNC_INTERVAL=300
```

### 2.2 Webhook Configuration
```json
{
  "resource": "workspace_gid",
  "target": "https://your-domain.com/webhooks/asana",
  "filters": [
    {
      "resource_type": "task",
      "action": "changed"
    },
    {
      "resource_type": "task",
      "action": "added"
    },
    {
      "resource_type": "task",
      "action": "removed"
    }
  ]
}
```

## Phase 3: Integration Implementation

### 3.1 Authentication Flow
```python
import requests
from urllib.parse import urlencode

class AsanaAuth:
    def __init__(self, client_id, client_secret, redirect_uri):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.auth_url = "https://app.asana.com/-/oauth_authorize"
        self.token_url = "https://app.asana.com/-/oauth_token"
    
    def get_authorization_url(self, state=None):
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "state": state or ""
        }
        return f"{self.auth_url}?{urlencode(params)}"
    
    def exchange_code(self, code):
        response = requests.post(
            self.token_url,
            data={
                "grant_type": "authorization_code",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": self.redirect_uri,
                "code": code
            }
        )
        return response.json()
    
    def refresh_token(self, refresh_token):
        response = requests.post(
            self.token_url,
            data={
                "grant_type": "refresh_token",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": refresh_token
            }
        }
        return response.json()
```

### 3.2 API Client Implementation
```python
class AsanaClient:
    def __init__(self, access_token):
        self.access_token = access_token
        self.base_url = "https://app.asana.com/api/1.0"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    def get_workspaces(self):
        response = requests.get(
            f"{self.base_url}/workspaces",
            headers=self.headers
        )
        return response.json()
    
    def get_projects(self, workspace_gid):
        response = requests.get(
            f"{self.base_url}/workspaces/{workspace_gid}/projects",
            headers=self.headers
        )
        return response.json()
    
    def create_task(self, task_data, workspace_gid):
        response = requests.post(
            f"{self.base_url}/tasks",
            headers=self.headers,
            json={
                "data": {
                    **task_data,
                    "workspace": workspace_gid
                }
            }
        )
        return response.json()
    
    def update_task(self, task_gid, updates):
        response = requests.put(
            f"{self.base_url}/tasks/{task_gid}",
            headers=self.headers,
            json={"data": updates}
        )
        return response.json()
    
    def get_task(self, task_gid):
        response = requests.get(
            f"{self.base_url}/tasks/{task_gid}",
            headers=self.headers,
            params={"opt_fields": "name,notes,completed,due_on,assignee,projects,custom_fields"}
        )
        return response.json()
```

### 3.3 Webhook Handler
```python
from fastapi import Request, HTTPException
import hmac
import hashlib

async def verify_asana_webhook(request: Request, secret: str):
    signature = request.headers.get("X-Hook-Signature")
    body = await request.body()
    
    computed = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, computed):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    return await request.json()

@app.post("/webhooks/asana")
async def asana_webhook(request: Request):
    payload = await request.json()
    
    # Webhook handshake
    if "X-Hook-Secret" in request.headers:
        secret = request.headers["X-Hook-Secret"]
        return {"X-Hook-Secret": secret}
    
    # Verify signature
    await verify_asana_webhook(request, WEBHOOK_SECRET)
    
    events = payload.get("events", [])
    for event in events:
        action = event.get("action")
        resource_type = event.get("resource", {}).get("resource_type")
        
        if resource_type == "task":
            if action == "changed":
                await handle_task_changed(event)
            elif action == "added":
                await handle_task_added(event)
            elif action == "removed":
                await handle_task_removed(event)
    
    return {"status": "received"}
```

## Phase 4: Data Synchronization

### 4.1 Sync Strategy
- **Real-time**: Use webhooks for immediate updates
- **Batch**: Periodic sync every 5 minutes for reliability
- **On-demand**: Manual sync trigger for specific entities

### 4.2 Data Mapping
```python
ASANA_SUMMIT_MAPPING = {
    "task": {
        "gid": "external_id",
        "name": "title",
        "notes": "description",
        "completed": "completed",
        "due_on": "due_date",
        "assignee": "assignee",
        "projects": "projects",
        "custom_fields": "metadata",
        "tags": "tags"
    }
}
```

### 4.3 Bi-directional Sync
```python
class AsanaSync:
    def __init__(self, client):
        self.client = client
        self.last_sync = None
    
    async def sync_tasks(self, project_gid):
        tasks = self.client.get_tasks(project_gid)
        for task in tasks:
            await self.sync_task_to_summit(task)
    
    async def sync_from_summit(self, summit_task, workspace_gid):
        asana_data = self.map_summit_to_asana(summit_task)
        if summit_task.external_id:
            return self.client.update_task(
                summit_task.external_id,
                asana_data
            )
        else:
            result = self.client.create_task(
                asana_data,
                workspace_gid
            )
            summit_task.external_id = result["data"]["gid"]
            return result
```

## Phase 5: Testing

### 5.1 Test OAuth Flow
```bash
curl "https://app.asana.com/-/oauth_authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code"
```

### 5.2 Test API Access
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://app.asana.com/api/1.0/workspaces
```

### 5.3 Test Webhook
```bash
curl -X POST https://your-domain.com/webhooks/asana \
  -H "Content-Type: application/json" \
  -H "X-Hook-Signature: test_signature" \
  -d '{"events": [{"action": "changed", "resource": {"gid": "123", "resource_type": "task"}}]}'
```

## Phase 6: Production Deployment

### 6.1 Security Checklist
- [ ] Store credentials in secure vault
- [ ] Enable webhook signature verification
- [ ] Implement rate limiting
- [ ] Add request timeout handling
- [ ] Enable HTTPS for all endpoints
- [ ] Implement token refresh mechanism
- [ ] Add audit logging

### 6.2 Monitoring
- API call volume and latency
- Webhook delivery success rate
- Sync lag and failures
- Rate limit consumption
- Error rates by endpoint
- Token expiration tracking

### 6.3 Rate Limits
- **Standard**: 1,500 requests per minute per user
- **Premium**: Same as Standard
- **Enterprise**: Higher limits available on request

## Phase 7: Advanced Features

### 7.1 Custom Fields
```python
def set_custom_field(task_gid, custom_field_gid, value):
    return client.put(
        f"/tasks/{task_gid}",
        json={
            "data": {
                "custom_fields": {
                    custom_field_gid: value
                }
            }
        }
    )
```

### 7.2 Subtasks
```python
def create_subtask(parent_task_gid, subtask_data):
    return client.post(
        f"/tasks/{parent_task_gid}/subtasks",
        json={"data": subtask_data}
    )
```

### 7.3 Dependencies
```python
def add_dependency(task_gid, dependency_gid):
    return client.post(
        f"/tasks/{task_gid}/addDependencies",
        json={
            "data": {
                "dependencies": [dependency_gid]
            }
        }
    )
```

### 7.4 Attachments
```python
def add_attachment(task_gid, file_path):
    with open(file_path, 'rb') as file:
        return client.post(
            f"/tasks/{task_gid}/attachments",
            files={'file': file}
        )
```

## Resources
- [Asana API Documentation](https://developers.asana.com/docs)
- [Asana Webhooks Guide](https://developers.asana.com/docs/webhooks)
- [OAuth 2.0 Flow](https://developers.asana.com/docs/oauth)
- [Rate Limits](https://developers.asana.com/docs/rate-limits)

## Troubleshooting

### Common Issues
1. **401 Unauthorized**: Check token validity and refresh if needed
2. **429 Rate Limited**: Implement exponential backoff
3. **Webhook Handshake Failed**: Return X-Hook-Secret header correctly
4. **Sync Conflicts**: Implement last-write-wins or conflict resolution

## Status
- [x] Documentation created
- [ ] OAuth implementation
- [ ] API client development
- [ ] Webhook handler setup
- [ ] Testing completed
- [ ] Production deployment
