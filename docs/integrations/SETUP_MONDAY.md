# Monday.com Integration Setup

## Overview
Complete setup guide for integrating Monday.com with Summit, including OAuth, API access, webhooks, and bidirectional data synchronization.

## Prerequisites
- Monday.com account (Individual, Basic, Standard, Pro, or Enterprise)
- Admin access to Monday workspace
- Summit deployment with webhook endpoint
- Valid SSL certificate

## Phase 1: Initial Setup

### 1.1 Create Monday App
1. Navigate to https://monday.com/developers/apps
2. Click "Create App"
3. Configure app:
   - **App Name**: Summit Integration
   - **Description**: AI-powered workflow orchestration
   - **Redirect URLs**: `https://your-domain.com/auth/monday/callback`
   - **Webhook URL**: `https://your-domain.com/webhooks/monday`

### 1.2 OAuth 2.0 Setup
1. Note credentials:
   ```
   CLIENT_ID: [Your Client ID]
   CLIENT_SECRET: [Your Client Secret]
   ```
2. Configure scopes:
   - `boards:read` - Read board data
   - `boards:write` - Create/update boards
   - `items:read` - Read items
   - `items:write` - Create/update items
   - `updates:read` - Read updates
   - `updates:write` - Create updates
   - `users:read` - Read user information
   - `webhooks:read` - Manage webhooks

### 1.3 API Token (Alternative)
1. Go to Profile → Admin → API
2. Generate API token
3. Store: `MONDAY_API_TOKEN=your_token`

## Phase 2: Environment Configuration

### 2.1 Environment Variables
```bash
# Monday OAuth
MONDAY_CLIENT_ID=your_client_id
MONDAY_CLIENT_SECRET=your_client_secret
MONDAY_REDIRECT_URI=https://your-domain.com/auth/monday/callback

# Monday API
MONDAY_API_TOKEN=your_token
MONDAY_WORKSPACE_ID=your_workspace_id
MONDAY_WEBHOOK_SECRET=your_webhook_secret

# Settings
MONDAY_API_BASE_URL=https://api.monday.com/v2
MONDAY_RATE_LIMIT=60
MONDAY_SYNC_INTERVAL=300
```

### 2.2 Webhook Configuration
```json
{
  "url": "https://your-domain.com/webhooks/monday",
  "event": "change_column_value",
  "config": {
    "boardId": "your_board_id"
  }
}
```

## Phase 3: GraphQL API Implementation

### 3.1 Authentication
```python
import requests

class MondayAuth:
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.auth_url = "https://auth.monday.com/oauth2/authorize"
        self.token_url = "https://auth.monday.com/oauth2/token"
    
    def get_authorization_url(self, redirect_uri):
        return (
            f"{self.auth_url}?"
            f"client_id={self.client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code"
        )
    
    def exchange_code(self, code, redirect_uri):
        response = requests.post(
            self.token_url,
            json={
                "code": code,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": redirect_uri
            }
        )
        return response.json()
```

### 3.2 GraphQL Client
```python
class MondayClient:
    def __init__(self, api_token):
        self.api_token = api_token
        self.api_url = "https://api.monday.com/v2"
        self.headers = {
            "Authorization": api_token,
            "Content-Type": "application/json"
        }
    
    def execute_query(self, query, variables=None):
        response = requests.post(
            self.api_url,
            json={"query": query, "variables": variables},
            headers=self.headers
        )
        return response.json()
    
    def get_boards(self):
        query = """
        query {
          boards {
            id
            name
            description
            items {
              id
              name
            }
          }
        }
        """
        return self.execute_query(query)
    
    def create_item(self, board_id, item_name, column_values=None):
        query = """
        mutation ($board_id: Int!, $item_name: String!, $column_values: JSON) {
          create_item (
            board_id: $board_id,
            item_name: $item_name,
            column_values: $column_values
          ) {
            id
            name
          }
        }
        """
        variables = {
            "board_id": int(board_id),
            "item_name": item_name,
            "column_values": column_values or {}
        }
        return self.execute_query(query, variables)
    
    def update_item(self, item_id, column_values):
        query = """
        mutation ($item_id: Int!, $column_values: JSON!) {
          change_multiple_column_values (
            item_id: $item_id,
            board_id: null,
            column_values: $column_values
          ) {
            id
          }
        }
        """
        variables = {
            "item_id": int(item_id),
            "column_values": column_values
        }
        return self.execute_query(query, variables)
```

### 3.3 Webhook Handler
```python
from fastapi import Request, HTTPException
import hmac
import hashlib
import json

@app.post("/webhooks/monday")
async def monday_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Authorization")
    
    # Verify signature
    if not verify_monday_signature(body, signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=401)
    
    payload = json.loads(body)
    event_type = payload.get("event", {}).get("type")
    
    if event_type == "change_column_value":
        await handle_column_change(payload)
    elif event_type == "create_item":
        await handle_item_created(payload)
    elif event_type == "update_name":
        await handle_name_updated(payload)
    
    return {"challenge": payload.get("challenge")}

def verify_monday_signature(body, signature, secret):
    computed = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, computed)
```

## Phase 4: Data Synchronization

### 4.1 Sync Strategy
- **Real-time**: Webhooks for immediate updates
- **Batch**: Periodic full sync every 5 minutes
- **On-demand**: Manual trigger for specific boards

### 4.2 Data Mapping
```python
MONDAY_SUMMIT_MAPPING = {
    "item": {
        "id": "external_id",
        "name": "title",
        "column_values": {
            "status": "status",
            "text": "description",
            "date": "due_date",
            "people": "assignees",
            "tags": "tags"
        }
    }
}
```

### 4.3 Bi-directional Sync
```python
class MondaySync:
    def __init__(self, client):
        self.client = client
    
    async def sync_board(self, board_id):
        query = """
        query ($board_id: [Int]) {
          boards (ids: $board_id) {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
        """
        result = self.client.execute_query(
            query,
            {"board_id": [int(board_id)]}
        )
        return result
    
    async def sync_to_monday(self, summit_task, board_id):
        column_values = self.map_summit_to_monday(summit_task)
        
        if summit_task.external_id:
            return self.client.update_item(
                summit_task.external_id,
                json.dumps(column_values)
            )
        else:
            result = self.client.create_item(
                board_id,
                summit_task.title,
                json.dumps(column_values)
            )
            summit_task.external_id = result["data"]["create_item"]["id"]
            return result
```

## Phase 5: Testing

### 5.1 Test OAuth
```bash
curl "https://auth.monday.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code"
```

### 5.2 Test GraphQL API
```bash
curl -X POST https://api.monday.com/v2 \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { boards { id name } }"}'
```

### 5.3 Test Webhook
```bash
curl -X POST https://your-domain.com/webhooks/monday \
  -H "Content-Type: application/json" \
  -H "Authorization: test_signature" \
  -d '{"event": {"type": "change_column_value"}, "challenge": "test"}'
```

## Phase 6: Production Deployment

### 6.1 Security Checklist
- [ ] Secure credential storage
- [ ] Webhook signature verification
- [ ] Rate limiting implementation
- [ ] Request timeout handling
- [ ] HTTPS enforcement
- [ ] Token refresh mechanism
- [ ] Audit logging

### 6.2 Monitoring
- GraphQL query performance
- Webhook delivery rates
- Sync lag metrics
- Rate limit tracking
- Error rates

### 6.3 Rate Limits
- **Standard**: 60 requests/minute
- **Pro**: Higher limits available
- **Enterprise**: Custom limits

## Phase 7: Advanced Features

### 7.1 Custom Columns
```python
def update_column(item_id, column_id, value):
    query = """
    mutation ($item_id: Int!, $column_id: String!, $value: JSON!) {
      change_column_value (
        item_id: $item_id,
        column_id: $column_id,
        value: $value
      ) {
        id
      }
    }
    """
    return client.execute_query(query, {
        "item_id": item_id,
        "column_id": column_id,
        "value": json.dumps(value)
    })
```

### 7.2 Subitems
```python
def create_subitem(parent_item_id, item_name):
    query = """
    mutation ($parent_item_id: Int!, $item_name: String!) {
      create_subitem (
        parent_item_id: $parent_item_id,
        item_name: $item_name
      ) {
        id
        name
      }
    }
    """
    return client.execute_query(query, {
        "parent_item_id": parent_item_id,
        "item_name": item_name
    })
```

### 7.3 Updates/Comments
```python
def create_update(item_id, body):
    query = """
    mutation ($item_id: Int!, $body: String!) {
      create_update (
        item_id: $item_id,
        body: $body
      ) {
        id
        text_body
      }
    }
    """
    return client.execute_query(query, {
        "item_id": item_id,
        "body": body
    })
```

## Resources
- [Monday.com API Documentation](https://developer.monday.com/api-reference/docs)
- [GraphQL Playground](https://developer.monday.com/api-reference/docs/introduction-to-graphql)
- [Webhooks Guide](https://developer.monday.com/apps/docs/webhooks)
- [OAuth Flow](https://developer.monday.com/apps/docs/oauth)

## Troubleshooting

### Common Issues
1. **401 Unauthorized**: Verify token validity
2. **Rate Limited**: Implement backoff strategy
3. **GraphQL Errors**: Check query syntax and permissions
4. **Webhook Challenge**: Return challenge value correctly

## Status
- [x] Documentation created
- [ ] OAuth implementation
- [ ] GraphQL client development
- [ ] Webhook handler setup
- [ ] Testing completed
- [ ] Production deployment
