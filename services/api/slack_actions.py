from fastapi import APIRouter, Request, Response, HTTPException, Header, Form
from slack_sdk import WebClient
import os, json, hmac, hashlib, time
from .audit import write as audit

router = APIRouter()

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_SIGNING_SECRET = os.getenv("SLACK_SIGNING_SECRET")

client = WebClient(token=SLACK_BOT_TOKEN)

def verify_slack(sig: str, ts: str, body: bytes):
    if not SLACK_SIGNING_SECRET: return  # skip if not configured
    # Replay guard
    if abs(time.time() - int(ts)) > 60*5:
        raise HTTPException(401, "stale request")
    base = f"v0:{ts}:{body.decode()}".encode()
    mac = "v0=" + hmac.new(SLACK_SIGNING_SECRET.encode(), base, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(mac, sig):
        raise HTTPException(401, "invalid signature")

@router.post("/slack/events")
async def slack_events(request: Request):
    req_body = await request.body()
    data = json.loads(req_body)
    if data["type"] == "url_verification":
        return Response(content=data["challenge"], media_type="text/plain")

    # For interactive components, verify signature
    if data["type"] == "interactive_message" or data["type"] == "block_actions":
        # Extract headers for verification
        x_slack_signature = request.headers.get("x-slack-signature", "")
        x_slack_request_timestamp = request.headers.get("x-slack-request-timestamp", "")
        verify_slack(x_slack_signature, x_slack_request_timestamp, req_body)

        payload = json.loads(data["payload"])
        action_id = payload["actions"][0]["action_id"]
        case_id = payload["callback_id"]

        audit(actor="slack_user", action=f"slack_action_{action_id}", case_id=case_id, details=payload)

        if action_id == "open_ui":
            client.chat_postMessage(channel=payload["channel"]["id"], thread_ts=payload["message_ts"],
                                    text=f"Opening UI for case {case_id}: http://localhost:3000/case/{case_id}")
        elif action_id == "summarize_case":
            client.chat_postMessage(channel=payload["channel"]["id"], thread_ts=payload["message_ts"],
                                    text=f"Summarizing case {case_id}...")
        elif action_id == "export_bundle":
            client.chat_postMessage(channel=payload["channel"]["id"], thread_ts=payload["message_ts"],
                                    text=f"Exporting bundle for case {case_id}...")
        return Response(status_code=200)

    return Response(status_code=200)

@router.post("/slack/actions")
async def actions(payload: str = Form(default=None),
                  x_slack_signature: str = Header(default=""),
                  x_slack_request_timestamp: str = Header(default=""),
                  request: Request=None):
    raw = await request.body()
    verify_slack(x_slack_signature, x_slack_request_timestamp, raw)
    audit(actor="slack_user", action="slack_interactive_action", case_id=None, details=json.loads(payload))
    # This is a placeholder for the actual logic to handle Slack actions
    # The prompt only provided the verification part.
    return Response(status_code=200)