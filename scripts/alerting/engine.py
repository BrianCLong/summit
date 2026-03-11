import json
import logging
import operator
import time
import os
from .formatters import format_slack, format_pagerduty, format_email

# Set up logging for alert history
log_file = os.path.join(os.path.dirname(__file__), 'alert_history.log')
logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('SummitAlerts')

# Mapping string operators to Python operator functions
OPERATORS = {
    '>': operator.gt,
    '<': operator.lt,
    '>=': operator.ge,
    '<=': operator.le,
    '==': operator.eq,
    '!=': operator.ne
}

# In-memory dictionary for deduplication (metric_name -> timestamp of last alert)
ALERT_STATE = {}
DEDUP_INTERVAL_SEC = 300 # 5 minutes

def evaluate_metrics(metrics, config_path):
    """
    Evaluates live metrics against the thresholds defined in the configuration file.
    """
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
    except FileNotFoundError:
        logger.error(f"Configuration file not found: {config_path}")
        return
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON in configuration file: {config_path}")
        return

    rules = config.get("rules", [])

    for rule in rules:
        metric_name = rule.get("metric")
        if metric_name not in metrics:
            logger.debug(f"Metric {metric_name} not found in provided live metrics. Skipping rule {rule.get('name')}.")
            continue

        current_value = metrics[metric_name]
        threshold = rule.get("threshold")
        op_str = rule.get("operator")

        if op_str not in OPERATORS:
            logger.error(f"Invalid operator {op_str} in rule {rule.get('name')}")
            continue

        op_func = OPERATORS[op_str]

        # Evaluate condition
        if op_func(current_value, threshold):
            alert = {
                "rule": rule,
                "value": current_value,
                "timestamp": time.time()
            }
            process_alert(alert)

def deduplicate_alert(alert):
    """
    Check if alert should be suppressed due to recent triggering.
    Returns True if alert is a duplicate and should be suppressed, False otherwise.
    """
    rule_name = alert["rule"]["name"]
    current_time = alert["timestamp"]

    if rule_name in ALERT_STATE:
        last_triggered = ALERT_STATE[rule_name]
        if (current_time - last_triggered) < DEDUP_INTERVAL_SEC:
            logger.info(f"Alert suppressed (deduplication): {rule_name}")
            return True

    ALERT_STATE[rule_name] = current_time
    return False

def route_alert(alert):
    """
    Routes the alert based on its severity level.
    """
    severity = alert["rule"].get("severity", "info").lower()
    name = alert["rule"].get("name")

    if severity == "critical":
        payload = format_pagerduty(alert)
        logger.info(f"Routing CRITICAL alert '{name}' to PagerDuty. Payload length: {len(payload)}")
        # Here you would typically make a requests.post to PagerDuty API
    elif severity == "warning":
        payload = format_slack(alert)
        logger.info(f"Routing WARNING alert '{name}' to Slack. Payload length: {len(payload)}")
        # Here you would typically make a requests.post to Slack webhook
    elif severity == "info":
        payload = format_email(alert)
        logger.info(f"Routing INFO alert '{name}' to Email. Subject: {payload['subject']}")
        # Here you would typically send an email
    else:
        logger.warning(f"Unknown severity '{severity}' for alert '{name}'. Defaulting to Email routing.")
        payload = format_email(alert)

def process_alert(alert):
    """
    Processes a triggered alert: deduplicates, logs, and routes it.
    """
    if not deduplicate_alert(alert):
        logger.warning(f"ALERT TRIGGERED: {alert['rule']['name']} - Metric {alert['rule']['metric']} evaluated to {alert['value']}")
        route_alert(alert)

if __name__ == "__main__":
    # Example usage
    mock_metrics = {
        "error_rate": 0.08,  # > 0.05 (Critical)
        "latency_ms": 250,   # > 200 (Warning)
        "db_connected": 1,   # == 1 (Not failing < 1)
        "memory_available_mb": 400 # < 512 (Warning)
    }
    config_file = os.path.join(os.path.dirname(__file__), 'rules', 'config.json')
    print("Evaluating mock metrics...")
    evaluate_metrics(mock_metrics, config_file)
    print("Evaluation complete. Check alert_history.log")
