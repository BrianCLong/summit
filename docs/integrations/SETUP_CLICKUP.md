# ClickUp Integration Setup

## Overview
This guide covers the complete setup process for integrating ClickUp with Summit, including OAuth configuration, API access, webhook setup, and data synchronization.

## Prerequisites
- ClickUp account (Free, Unlimited, Business, or Enterprise)
- Admin access to ClickUp workspace
- Summit deployment with webhook endpoint capability
- Valid SSL certificate for webhook endpoints

## Phase 1: Initial Setup

### 1.1 Create ClickUp App
1. Navigate to https://app.clickup.com/settings/apps
2. Click "Create an App"
3. Fill in app details:
   - **App Name**: Summit Integration
   - **Description**: Agentic AI workflow integration
   - **Redirect URL(s)**: `https://your-domain.com/auth/clickup/callback`
   - **Webhook URL**: `https://your-domain.com/webhooks/clickup`

### 1.2 OAuth 2.0 Configuration
1. Note your credentials:
   ```
   CLIENT_ID: [Your Client ID]
   CLIENT_SECRET: [Your Client Secret]
   ```
2. Configure OAuth scopes:
   - `tasks:read` - Read task data
   - `tasks:write` - Create and update tasks
   - `spaces:read` - Read space information
   - `lists:read` - Read list data
   - `folders:read` - Read folder structure
   - `comments:read` - Read comments
   - `comments:write` - Create comments
   - `webhooks:read` - Manage webhooks

### 1.3 API Token Setup (Alternative)
For server-to-server integration:
1. Go to Settings → Apps → API Token
2. Click "Generate"
3. Store securely: `CLICKUP_API_TOKEN=pk_[your_token]`

## Phase 2: Environment Configuration

### 2.1 Environment Variables
Add to your `.env` file:
```bash
# ClickUp OAuth
CLICKUP_CLIENT_ID=your_client_id
CLICKUP_CLIENT_SECRET=your_client_secret
CLICKUP_REDIRECT_URI=https://your-domain.com/auth/clickup/callback

# ClickUp API
CLICKUP_API_TOKEN=pk_your_token
CLICKUP_WORKSPACE_ID=your_workspace_id
CLICKUP_WEBHOOK_SECRET=your_webhook_secret

# ClickUp Settings
CLICKUP_API_BASE_URL=https://api.clickup.com/api/v2
CLICKUP_RATE_LIMIT=100
CLICKUP_SYNC_INTERVAL=300
```

### 2.2 Webhook Configuration
```json
{
  "endpoint": "https://your-domain.com/webhooks/clickup",
  "events": [
    "taskCreated",
    "taskUpdated",
    "taskDeleted",
    "taskCommentPosted",
    "taskStatusUpdated",
    "taskAssigneeUpdated",
    "taskDueDateUpdated",
    "taskPriorityUpdated"
  ],
  "space_id": "your_space_id"
}
```

## Phase 3: Integration Implementation

### 3.1 Authentication Flow
```python
import requests
from urllib.parse import urlencode

class ClickUpAuth:
    def __init__(self, client_id, client_secret, redirect_uri):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.auth_url = "https://app.clickup.com/api"
    
    def get_authorization_url(self, state=None):
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": state or ""
        }
        return f"{self.auth_url}?{urlencode(params)}"
    
    def exchange_code(self, code):
        response = requests.post(
            f"{self.auth_url}/oauth/token",
            params={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code
            }
        )
        return response.json()
```

### 3.2 API Client Implementation
```python
class ClickUpClient:
    def __init__(self, api_token):
        self.api_token = api_token
        self.base_url = "https://api.clickup.com/api/v2"
        self.headers = {
            "Authorization": api_token,
            "Content-Type": "application/json"
        }
    
    def get_workspaces(self):
        response = requests.get(
            f"{self.base_url}/team",
            headers=self.headers
        )
        return response.json()
    
    def get_spaces(self, team_id):
        response = requests.get(
            f"{self.base_url}/team/{team_id}/space",
            headers=self.headers
        )
        return response.json()
    
    def create_task(self, list_id, task_data):
        response = requests.post(
            f"{self.base_url}/list/{list_id}/task",
            headers=self.headers,
            json=task_data
        )
        return response.json()
    
    def update_task(self, task_id, updates):
        response = requests.put(
            f"{self.base_url}/task/{task_id}",
            headers=self.headers,
            json=updates
        )
        return response.json()
```

### 3.3 Webhook Handler
```python
from fastapi import Request, HTTPException
import hmac
import hashlib

async def verify_clickup_webhook(request: Request, secret: str):
    signature = request.headers.get("X-Signature")
    body = await request.body()
    
    computed = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, computed):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    return await request.json()

@app.post("/webhooks/clickup")
async def clickup_webhook(request: Request):
    payload = await verify_clickup_webhook(request, WEBHOOK_SECRET)
    event_type = payload.get("event")
    
    if event_type == "taskCreated":
        await handle_task_created(payload)
    elif event_type == "taskUpdated":
        await handle_task_updated(payload)
    elif event_type == "taskStatusUpdated":
        await handle_status_updated(payload)
    
    return {"status": "received"}
```

## Phase 4: Data Synchronization

### 4.1 Sync Strategy
- **Real-time**: Use webhooks for immediate updates
- **Batch**: Periodic sync every 5 minutes for reliability
- **On-demand**: Manual sync trigger for specific entities

### 4.2 Data Mapping
```python
CLICKUP_SUMMIT_MAPPING = {
    "task": {
        "id": "external_id",
        "name": "title",
        "description": "description",
        "status": "status",
        "priority": "priority",
        "due_date": "due_date",
        "assignees": "assignees",
        "tags": "tags",
        "custom_fields": "metadata"
    }
}
```

### 4.3 Bi-directional Sync
```python
class ClickUpSync:
    def __init__(self, client):
        self.client = client
        self.last_sync = None
    
    async def sync_tasks(self, list_id):
        tasks = self.client.get_tasks(list_id)
        for task in tasks:
            await self.sync_task_to_summit(task)
    
    async def sync_from_summit(self, summit_task):
        clickup_data = self.map_summit_to_clickup(summit_task)
        if summit_task.external_id:
            return self.client.update_task(
                summit_task.external_id,
                clickup_data
            )
        else:
            result = self.client.create_task(
                summit_task.list_id,
                clickup_data
            )
            summit_task.external_id = result["id"]
            return result
```

## Phase 5: Testing

### 5.1 Test OAuth Flow
```bash
curl -X GET "https://app.clickup.com/api?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI"
```

### 5.2 Test API Access
```bash
curl -H "Authorization: YOUR_API_TOKEN" \
     https://api.clickup.com/api/v2/team
```

### 5.3 Test Webhook
```bash
curl -X POST https://your-domain.com/webhooks/clickup \
  -H "Content-Type: application/json" \
  -H "X-Signature: test_signature" \
  -d '{"event": "taskCreated", "task_id": "test"}'
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

### 6.3 Rate Limits
- **Free**: 100 requests/minute
- **Unlimited**: 100 requests/minute
- **Business**: 100 requests/minute
- **Enterprise**: 10,000 requests/minute

## Phase 7: Advanced Features

### 7.1 Custom Fields
```python
def create_custom_field_value(task_id, field_id, value):
    return client.post(
        f"/task/{task_id}/field/{field_id}",
        json={"value": value}
    )
```

### 7.2 Time Tracking
```python
def add_time_entry(task_id, duration, description):
    return client.post(
        f"/task/{task_id}/time",
        json={
            "duration": duration,
            "description": description
        }
    )
```

### 7.3 Dependencies
```python
def add_dependency(task_id, depends_on_task_id):
    return client.post(
        f"/task/{task_id}/dependency",
        json={
            "depends_on": depends_on_task_id,
            "dependency_of": task_id
        }
    )
```

## Resources
- [ClickUp API Documentation](https://clickup.com/api)
- [ClickUp Webhooks Guide](https://clickup.com/api/developer-portal/webhooks/)
- [OAuth 2.0 Flow](https://clickup.com/api/developer-portal/authentication/)
- [Rate Limits](https://clickup.com/api/developer-portal/rate-limits/)

## Troubleshooting

### Common Issues
1. **401 Unauthorized**: Check API token validity
2. **Rate Limited**: Implement exponential backoff
3. **Webhook Not Receiving**: Verify endpoint accessibility and SSL
4. **Sync Conflicts**: Implement last-write-wins or manual resolution

## Status
- [x] Documentation created
- [ ] OAuth implementation
- [ ] API client development
- [ ] Webhook handler setup
- [ ] Testing completed
- [ ] Production deployment
