# Airtable Integration Setup

## Overview
Complete setup guide for integrating Airtable with Summit, including OAuth, API access, webhooks, and data synchronization.

## Prerequisites
- Airtable account (Free, Plus, Pro, or Enterprise)
- Base creator or owner permissions
- Summit deployment with webhook endpoint
- Valid SSL certificate

## Phase 1: Initial Setup

### 1.1 Create Airtable Integration
1. Navigate to https://airtable.com/create/oauth
2. Click "Register new OAuth integration"
3. Configure integration:
   - **Name**: Summit Integration
   - **Description**: AI-powered workflow orchestration platform
   - **Redirect URL**: `https://your-domain.com/auth/airtable/callback`
   - **Webhook URL**: `https://your-domain.com/webhooks/airtable`

### 1.2 OAuth 2.0 Configuration
1. Note credentials:
   ```
   CLIENT_ID: [Your Client ID]
   CLIENT_SECRET: [Your Client Secret]
   ```
2. Configure scopes:
   - `data.records:read` - Read records
   - `data.records:write` - Create/update records
   - `data.recordComments:read` - Read comments
   - `data.recordComments:write` - Create comments
   - `schema.bases:read` - Read base schema
   - `webhook:manage` - Manage webhooks

### 1.3 Personal Access Token (Alternative)
1. Go to https://airtable.com/create/tokens
2. Create new token with required scopes
3. Store securely: `AIRTABLE_ACCESS_TOKEN=pat[your_token]`

## Phase 2: Environment Configuration

### 2.1 Environment Variables
```bash
# Airtable OAuth
AIRTABLE_CLIENT_ID=your_client_id
AIRTABLE_CLIENT_SECRET=your_client_secret
AIRTABLE_REDIRECT_URI=https://your-domain.com/auth/airtable/callback

# Airtable API
AIRTABLE_ACCESS_TOKEN=pat_your_token
AIRTABLE_BASE_ID=app_your_base_id
AIRTABLE_WEBHOOK_SECRET=your_webhook_secret

# Settings
AIRTABLE_API_BASE_URL=https://api.airtable.com/v0
AIRTABLE_RATE_LIMIT=5
AIRTABLE_SYNC_INTERVAL=300
```

### 2.2 Webhook Configuration
```json
{
  "notificationUrl": "https://your-domain.com/webhooks/airtable",
  "specification": {
    "options": {
      "filters": {
        "dataTypes": ["tableData"],
        "recordChangeScope": "tblYourTableId"
      }
    }
  }
}
```

## Phase 3: API Implementation

### 3.1 Authentication
```python
import requests
from urllib.parse import urlencode

class AirtableAuth:
    def __init__(self, client_id, client_secret, redirect_uri):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.auth_url = "https://airtable.com/oauth2/v1/authorize"
        self.token_url = "https://airtable.com/oauth2/v1/token"
    
    def get_authorization_url(self, state=None):
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "state": state or "",
            "scope": "data.records:read data.records:write webhook:manage"
        }
        return f"{self.auth_url}?{urlencode(params)}"
    
    def exchange_code(self, code, code_verifier=None):
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri,
            "client_id": self.client_id
        }
        if code_verifier:
            data["code_verifier"] = code_verifier
        
        response = requests.post(
            self.token_url,
            data=data,
            auth=(self.client_id, self.client_secret)
        )
        return response.json()
```

### 3.2 API Client
```python
class AirtableClient:
    def __init__(self, access_token, base_id):
        self.access_token = access_token
        self.base_id = base_id
        self.api_url = f"https://api.airtable.com/v0/{base_id}"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    def get_records(self, table_name, params=None):
        response = requests.get(
            f"{self.api_url}/{table_name}",
            headers=self.headers,
            params=params or {}
        )
        return response.json()
    
    def create_record(self, table_name, fields):
        response = requests.post(
            f"{self.api_url}/{table_name}",
            headers=self.headers,
            json={"fields": fields}
        )
        return response.json()
    
    def update_record(self, table_name, record_id, fields):
        response = requests.patch(
            f"{self.api_url}/{table_name}/{record_id}",
            headers=self.headers,
            json={"fields": fields}
        )
        return response.json()
    
    def delete_record(self, table_name, record_id):
        response = requests.delete(
            f"{self.api_url}/{table_name}/{record_id}",
            headers=self.headers
        )
        return response.json()
```

### 3.3 Webhook Handler
```python
from fastapi import Request, HTTPException
import hmac
import hashlib

@app.post("/webhooks/airtable")
async def airtable_webhook(request: Request):
    # Get webhook payload
    payload = await request.json()
    
    # Verify webhook (if secret is configured)
    signature = request.headers.get("X-Airtable-Content-MAC")
    if signature and not verify_airtable_webhook(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Process webhook payload
    webhook_id = payload.get("webhook", {}).get("id")
    timestamp = payload.get("timestamp")
    
    # Handle different action types
    if "baseTransactionNumber" in payload:
        await handle_table_data_change(payload)
    
    return {"success": True}

def verify_airtable_webhook(payload, signature):
    computed = hmac.new(
        WEBHOOK_SECRET.encode(),
        str(payload).encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, computed)

async def handle_table_data_change(payload):
    base_transaction = payload.get("baseTransactionNumber")
    # Fetch changes using base transaction number
    changes = await fetch_table_changes(base_transaction)
    
    for change in changes:
        if change["type"] == "created":
            await handle_record_created(change)
        elif change["type"] == "updated":
            await handle_record_updated(change)
        elif change["type"] == "deleted":
            await handle_record_deleted(change)
```

## Phase 4: Data Synchronization

### 4.1 Sync Strategy
- **Real-time**: Webhooks for immediate updates
- **Batch**: Periodic sync every 5 minutes
- **Cursor-based**: For large datasets

### 4.2 Data Mapping
```python
AIRTABLE_SUMMIT_MAPPING = {
    "record": {
        "id": "external_id",
        "fields": {
            "Name": "title",
            "Description": "description",
            "Status": "status",
            "Priority": "priority",
            "Due Date": "due_date",
            "Assignee": "assignee",
            "Tags": "tags"
        },
        "createdTime": "created_at"
    }
}
```

### 4.3 Bi-directional Sync
```python
class AirtableSync:
    def __init__(self, client, table_name):
        self.client = client
        self.table_name = table_name
    
    async def sync_from_airtable(self):
        offset = None
        all_records = []
        
        while True:
            params = {"offset": offset} if offset else {}
            result = self.client.get_records(self.table_name, params)
            
            all_records.extend(result.get("records", []))
            offset = result.get("offset")
            
            if not offset:
                break
        
        for record in all_records:
            await self.sync_record_to_summit(record)
    
    async def sync_to_airtable(self, summit_task):
        airtable_fields = self.map_summit_to_airtable(summit_task)
        
        if summit_task.external_id:
            return self.client.update_record(
                self.table_name,
                summit_task.external_id,
                airtable_fields
            )
        else:
            result = self.client.create_record(
                self.table_name,
                airtable_fields
            )
            summit_task.external_id = result["id"]
            return result
```

## Phase 5: Testing

### 5.1 Test OAuth
```bash
curl "https://airtable.com/oauth2/v1/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=data.records:read"
```

### 5.2 Test API Access
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://api.airtable.com/v0/meta/bases
```

### 5.3 Test Record Creation
```bash
curl -X POST https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fields": {"Name": "Test Record"}}'
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
- API call volume and latency
- Webhook delivery rates
- Sync lag metrics
- Rate limit tracking
- Error rates by endpoint

### 6.3 Rate Limits
- **Free/Plus**: 5 requests/second per base
- **Pro/Enterprise**: 50 requests/second per base
- Higher limits available on request

## Phase 7: Advanced Features

### 7.1 Attachments
```python
def upload_attachment(table_name, record_id, file_url):
    fields = {
        "Attachments": [
            {"url": file_url}
        ]
    }
    return client.update_record(table_name, record_id, fields)
```

### 7.2 Linked Records
```python
def link_records(table_name, record_id, linked_field, linked_record_ids):
    fields = {
        linked_field: linked_record_ids
    }
    return client.update_record(table_name, record_id, fields)
```

### 7.3 Formulas & Rollups
```python
# Read-only fields - cannot be set via API
# But can be read and used in Summit
def get_computed_fields(table_name, record_id):
    record = client.get_records(table_name, {"filterByFormula": f"RECORD_ID()='{record_id}'"})
    return record["fields"]
```

## Resources
- [Airtable Web API](https://airtable.com/developers/web/api/introduction)
- [OAuth Integration Guide](https://airtable.com/developers/web/guides/oauth-integrations)
- [Webhooks](https://airtable.com/developers/web/api/webhooks-overview)
- [Rate Limits](https://airtable.com/developers/web/api/rate-limits)

## Troubleshooting

### Common Issues
1. **422 Invalid Request**: Check field types and values
2. **Rate Limited**: Implement exponential backoff
3. **Webhook Not Triggering**: Verify notification URL is accessible
4. **Attachment Upload Failed**: Ensure URL is publicly accessible

## Status
- [x] Documentation created
- [ ] OAuth implementation
- [ ] API client development
- [ ] Webhook handler setup
- [ ] Testing completed
- [ ] Production deployment
