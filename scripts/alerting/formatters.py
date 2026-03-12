import json

def format_slack(alert):
    """
    Format alert for Slack webhook.
    """
    color = "danger" if alert["rule"]["severity"] == "critical" else "warning"
    if alert["rule"]["severity"] == "info":
        color = "good"

    payload = {
        "attachments": [
            {
                "fallback": f"Alert: {alert['rule']['name']}",
                "color": color,
                "title": f"[{alert['rule']['severity'].upper()}] {alert['rule']['name']}",
                "text": f"Metric *{alert['rule']['metric']}* evaluated to {alert['value']}.\nThreshold was {alert['rule']['operator']} {alert['rule']['threshold']}.",
                "fields": [
                    {
                        "title": "Severity",
                        "value": alert["rule"]["severity"],
                        "short": True
                    },
                    {
                        "title": "Metric Value",
                        "value": str(alert["value"]),
                        "short": True
                    }
                ],
                "actions": [
                    {
                        "type": "button",
                        "text": "View Runbook",
                        "url": alert["rule"]["runbook_url"]
                    }
                ],
                "footer": "Summit Alerting System",
                "ts": int(alert["timestamp"])
            }
        ]
    }
    return json.dumps(payload)

def format_pagerduty(alert):
    """
    Format alert for PagerDuty Events API v2.
    """
    payload = {
        "routing_key": "YOUR_ROUTING_KEY", # Should be replaced with actual key or injected via env
        "event_action": "trigger",
        "dedup_key": f"{alert['rule']['name']}-{alert['rule']['metric']}",
        "payload": {
            "summary": f"{alert['rule']['name']} triggered on {alert['rule']['metric']} = {alert['value']}",
            "source": "summit-monitoring-system",
            "severity": alert["rule"]["severity"],
            "component": "alerting-engine",
            "custom_details": {
                "metric": alert["rule"]["metric"],
                "value": alert["value"],
                "threshold": alert["rule"]["threshold"],
                "operator": alert["rule"]["operator"],
                "runbook_url": alert["rule"]["runbook_url"]
            }
        },
        "links": [
            {
                "href": alert["rule"]["runbook_url"],
                "text": "Runbook"
            }
        ]
    }
    return json.dumps(payload)

def format_email(alert):
    """
    Format alert for Email.
    """
    subject = f"[{alert['rule']['severity'].upper()}] Alert: {alert['rule']['name']}"

    body = f"""
Summit Alerting System Notification

Alert Name: {alert['rule']['name']}
Severity: {alert['rule']['severity'].upper()}

Metric '{alert['rule']['metric']}' is currently at {alert['value']}.
This violates the threshold of {alert['rule']['operator']} {alert['rule']['threshold']}.

Please consult the runbook for resolution steps:
{alert['rule']['runbook_url']}

Time: {alert['timestamp']}
"""
    return {
        "subject": subject,
        "body": body
    }
