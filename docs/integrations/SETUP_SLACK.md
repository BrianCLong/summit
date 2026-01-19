# Slack Integration Setup

## Overview
Complete setup guide for integrating Slack with Summit, including OAuth, Bolt framework, event subscriptions, slash commands, and interactive components.

## Prerequisites
- Slack workspace with app installation permissions
- Admin access or permission to create apps
- Summit deployment with webhook endpoint
- Valid SSL certificate for event subscriptions

## Phase 1: Initial Setup

### 1.1 Create Slack App
1. Navigate to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From scratch"
4. Configure:
   - **App Name**: Summit Integration
   - **Workspace**: Select your workspace

### 1.2 OAuth & Permissions
1. Go to OAuth & Permissions
2. Add Redirect URLs:
   - `https://your-domain.com/auth/slack/callback`
3. Configure Bot Token Scopes:
   - `channels:read` - View channels
   - `channels:write` - Manage channels
   - `chat:write` - Send messages
   - `files:write` - Upload files
   - `users:read` - View users
   - `users:read.email` - View email addresses
   - `im:write` - Send DMs
   - `commands` - Add slash commands
   - `reactions:write` - Add reactions

### 1.3 App Credentials
1. Navigate to Basic Information
2. Note your credentials:
   ```
   CLIENT_ID: [Your Client ID]
   CLIENT_SECRET: [Your Client Secret]
   SIGNING_SECRET: [Your Signing Secret]
   ```

## Phase 2: Environment Configuration

### 2.1 Environment Variables
```bash
# Slack OAuth
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_REDIRECT_URI=https://your-domain.com/auth/slack/callback

# Slack App
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_USER_TOKEN=xoxp-your-user-token

# Slack Settings
SLACK_SOCKET_MODE=false
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_TEAM_ID=T0XXXXXXX
```

### 2.2 Event Subscriptions
1. Go to Event Subscriptions
2. Enable Events: Toggle On
3. Request URL: `https://your-domain.com/slack/events`
4. Subscribe to bot events:
   - `message.channels`
   - `message.im`
   - `app_mention`
   - `reaction_added`
   - `channel_created`
   - `member_joined_channel`

### 2.3 Slash Commands
1. Go to Slash Commands
2. Create commands:
   - Command: `/summit`
   - Request URL: `https://your-domain.com/slack/commands`
   - Short Description: "Summit AI Assistant"
   - Usage Hint: "[action] [parameters]"

## Phase 3: Implementation

### 3.1 Slack Bolt App
```python
from slack_bolt import App
from slack_bolt.adapter.fastapi import SlackRequestHandler
from fastapi import FastAPI, Request

# Initialize Slack app
app = App(
    token=SLACK_BOT_TOKEN,
    signing_secret=SLACK_SIGNING_SECRET
)

# Initialize FastAPI
api = FastAPI()
handler = SlackRequestHandler(app)

# OAuth flow
@api.get("/auth/slack")
async def slack_oauth_start():
    from slack_sdk.oauth import AuthorizeUrlGenerator
    
    generator = AuthorizeUrlGenerator(
        client_id=SLACK_CLIENT_ID,
        scopes=["channels:read", "chat:write", "commands"],
        user_scopes=["chat:write"]
    )
    return {"url": generator.generate(SLACK_REDIRECT_URI)}

@api.get("/auth/slack/callback")
async def slack_oauth_callback(code: str):
    from slack_sdk.oauth import OAuth2Client
    
    client = OAuth2Client(
        client_id=SLACK_CLIENT_ID,
        client_secret=SLACK_CLIENT_SECRET
    )
    
    response = client.oauth_v2_access(
        code=code,
        redirect_uri=SLACK_REDIRECT_URI
    )
    
    # Store tokens
    bot_token = response["access_token"]
    team_id = response["team"]["id"]
    
    return {"success": True, "team_id": team_id}
```

### 3.2 Event Handlers
```python
# Handle messages
@app.message("hello")
def message_hello(message, say):
    say(f"Hey there <@{message['user']}>!")

# Handle mentions
@app.event("app_mention")
def handle_app_mention(event, say):
    user = event["user"]
    text = event["text"]
    say(f"Thanks for mentioning me, <@{user}>!")

# Handle slash commands
@app.command("/summit")
def handle_summit_command(ack, command, respond):
    ack()
    text = command["text"]
    respond(f"Processing your request: {text}")

# Handle reactions
@app.event("reaction_added")
def handle_reaction_added(event, say):
    reaction = event["reaction"]
    user = event["user"]
    item = event["item"]
    # Process reaction
```

### 3.3 Interactive Components
```python
# Handle button clicks
@app.action("button_click")
def handle_button_click(ack, body, client):
    ack()
    user_id = body["user"]["id"]
    value = body["actions"][0]["value"]
    
    client.chat_postMessage(
        channel=user_id,
        text=f"You clicked: {value}"
    )

# Handle modal submissions
@app.view("modal_submission")
def handle_modal_submission(ack, body, view, client):
    ack()
    values = view["state"]["values"]
    # Process form submission

# Send interactive message
def send_interactive_message(channel, text):
    app.client.chat_postMessage(
        channel=channel,
        text=text,
        blocks=[
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": text}
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Approve"},
                        "action_id": "approve_button",
                        "value": "approve",
                        "style": "primary"
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Reject"},
                        "action_id": "reject_button",
                        "value": "reject",
                        "style": "danger"
                    }
                ]
            }
        ]
    )
```

### 3.4 FastAPI Integration
```python
# Event endpoint
@api.post("/slack/events")
async def slack_events(request: Request):
    return await handler.handle(request)

# Command endpoint
@api.post("/slack/commands")
async def slack_commands(request: Request):
    return await handler.handle(request)

# Interactive endpoint
@api.post("/slack/interactive")
async def slack_interactive(request: Request):
    return await handler.handle(request)
```

## Phase 4: Data Synchronization

### 4.1 Message Sync
```python
class SlackSync:
    def __init__(self, bot_token):
        from slack_sdk import WebClient
        self.client = WebClient(token=bot_token)
    
    async def sync_messages(self, channel_id, oldest=None):
        result = self.client.conversations_history(
            channel=channel_id,
            oldest=oldest,
            limit=100
        )
        
        messages = result["messages"]
        for message in messages:
            await self.process_message(message)
        
        if result["has_more"]:
            cursor = result["response_metadata"]["next_cursor"]
            await self.sync_messages(channel_id, cursor)
    
    async def post_to_slack(self, channel, text, thread_ts=None):
        return self.client.chat_postMessage(
            channel=channel,
            text=text,
            thread_ts=thread_ts
        )
```

### 4.2 User Sync
```python
async def sync_users():
    client = WebClient(token=SLACK_BOT_TOKEN)
    result = client.users_list()
    
    for user in result["members"]:
        if not user["is_bot"] and not user["deleted"]:
            await store_user({
                "id": user["id"],
                "name": user["name"],
                "real_name": user["real_name"],
                "email": user.get("profile", {}).get("email")
            })
```

## Phase 5: Testing

### 5.1 Test Bot Token
```bash
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer YOUR_BOT_TOKEN"
```

### 5.2 Test Message Posting
```bash
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"C0XXXXXXX","text":"Hello from Summit!"}'
```

### 5.3 Test Slash Command
```bash
curl -X POST https://your-domain.com/slack/commands \
  -d "token=YOUR_VERIFICATION_TOKEN&command=/summit&text=test"
```

## Phase 6: Production Deployment

### 6.1 Security Checklist
- [ ] Verify request signatures
- [ ] Store tokens securely
- [ ] Rate limiting implementation
- [ ] HTTPS enforcement
- [ ] Audit logging
- [ ] Error handling

### 6.2 Monitoring
- Event processing latency
- Command response times
- API call volume
- Error rates
- Rate limit usage

### 6.3 Rate Limits
- **Tier 1**: 1 request per minute
- **Tier 2**: 20 requests per minute
- **Tier 3**: 50 requests per minute
- **Tier 4**: 100 requests per minute

## Phase 7: Advanced Features

### 7.1 File Uploads
```python
def upload_file(channel, file_path, title):
    with open(file_path, 'rb') as file:
        return app.client.files_upload(
            channels=channel,
            file=file,
            title=title
        )
```

### 7.2 Modals
```python
def open_modal(trigger_id):
    app.client.views_open(
        trigger_id=trigger_id,
        view={
            "type": "modal",
            "title": {"type": "plain_text", "text": "Summit Task"},
            "submit": {"type": "plain_text", "text": "Submit"},
            "blocks": [
                {
                    "type": "input",
                    "block_id": "task_input",
                    "label": {"type": "plain_text", "text": "Task Name"},
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "task_name"
                    }
                }
            ]
        }
    )
```

### 7.3 Scheduled Messages
```python
import time

def schedule_message(channel, text, post_at):
    return app.client.chat_scheduleMessage(
        channel=channel,
        text=text,
        post_at=int(post_at.timestamp())
    )
```

## Resources
- [Slack API Documentation](https://api.slack.com/)
- [Bolt for Python](https://slack.dev/bolt-python/)
- [Block Kit Builder](https://app.slack.com/block-kit-builder)
- [OAuth Guide](https://api.slack.com/authentication/oauth-v2)

## Troubleshooting

### Common Issues
1. **Invalid Token**: Verify token and scopes
2. **URL Verification Failed**: Check endpoint accessibility
3. **Rate Limited**: Implement backoff strategy
4. **Event Not Received**: Verify event subscription settings

## Status
- [x] Documentation created
- [ ] OAuth implementation
- [ ] Bolt app development
- [ ] Event handlers setup
- [ ] Testing completed
- [ ] Production deployment
