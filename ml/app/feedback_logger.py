import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Create handlers
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Create formatters and add it to handlers
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
console_handler.setFormatter(formatter)

# Add handlers to the logger
logger.addHandler(console_handler)


def log_feedback(
    insight: dict, feedback_type: str, user: str, timestamp: str, original_prediction: dict
):
    """
    Logs user feedback on AI-generated insights.

    Args:
        insight (dict): The AI-generated insight that was reviewed.
        feedback_type (str): The type of feedback ('accept', 'reject', 'flag').
        user (str): The ID or name of the user providing feedback.
        timestamp (str): ISO 8601 timestamp of when the feedback was provided.
        original_prediction (dict): The original AI prediction associated with the insight.
    """
    feedback_entry = {
        "insight": insight,
        "feedback_type": feedback_type,
        "user": user,
        "timestamp": timestamp,
        "original_prediction": original_prediction,
        "logged_at": datetime.now().isoformat(),
    }
    logger.info(f"Received AI feedback: {json.dumps(feedback_entry)}")

    # In a real-world scenario, this feedback would be persisted to a database
    # or a dedicated data store for training/fine-tuning.
    # Example: save_to_database(feedback_entry)
    # Example: send_to_message_queue_for_training(feedback_entry)


if __name__ == "__main__":
    # Example usage
    sample_insight = {
        "type": "entity",
        "value": "John Doe",
        "sentiment": "positive",
        "confidence": 0.85,
    }
    sample_original_prediction = {
        "model_name": "sentiment_model_v1",
        "prediction_id": "pred_123",
        "raw_output": {"score": 0.9, "label": "positive"},
    }

    log_feedback(
        insight=sample_insight,
        feedback_type="accept",
        user="test_user_1",
        timestamp="2025-08-17T10:00:00Z",
        original_prediction=sample_original_prediction,
    )

    log_feedback(
        insight=sample_insight,
        feedback_type="reject",
        user="test_user_2",
        timestamp="2025-08-17T10:05:00Z",
        original_prediction=sample_original_prediction,
    )

    log_feedback(
        insight=sample_insight,
        feedback_type="flag",
        user="test_user_3",
        timestamp="2025-08-17T10:10:00Z",
        original_prediction=sample_original_prediction,
    )
