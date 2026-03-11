import json

def calculate_accuracy(expected, actual, task_type):
    """
    Calculate an accuracy score between 0.0 and 1.0 based on the task type.
    """
    if task_type == "entity_extraction":
        try:
            # Attempt to parse actual as JSON, if it's a string
            if isinstance(actual, str):
                actual_dict = json.loads(actual)
            else:
                actual_dict = actual

            # Compute a simple precision/recall based Jaccard similarity for lists
            total_expected_items = sum(len(v) for v in expected.values())

            correct_items = 0
            for key, expected_list in expected.items():
                actual_list = actual_dict.get(key, [])
                # Count matches
                for item in expected_list:
                    if item in actual_list:
                        correct_items += 1

            return correct_items / total_expected_items if total_expected_items > 0 else 0.0

        except (json.JSONDecodeError, AttributeError, TypeError):
            # Failed to parse JSON or invalid format
            return 0.0

    elif task_type == "narrative_risk_scoring":
        # Check if the score matches exactly
        return 1.0 if str(expected).strip() == str(actual).strip() else 0.0

    elif task_type == "query_response":
        # For free-form text, just do a very basic keyword overlap check
        # In a real system this might use an LLM-as-a-judge or ROUGE/BLEU
        expected_words = set(str(expected).lower().split())
        actual_words = set(str(actual).lower().split())

        # Stop words to ignore
        stop_words = {"a", "an", "the", "is", "are", "and", "or", "in", "with", "to", "of", "that", "it"}
        expected_words = expected_words - stop_words
        actual_words = actual_words - stop_words

        intersection = expected_words.intersection(actual_words)

        # Calculate overlap relative to expected words
        overlap_score = len(intersection) / len(expected_words) if expected_words else 0.0

        # Cap at 1.0
        return min(1.0, overlap_score)

    return 0.0

def calculate_hallucination_rate(expected, actual, task_type):
    """
    Calculate a hallucination rate score between 0.0 and 1.0.
    Lower is better (0.0 means no hallucination detected).
    """
    if task_type == "entity_extraction":
        try:
            if isinstance(actual, str):
                actual_dict = json.loads(actual)
            else:
                actual_dict = actual

            hallucinated_items = 0
            total_actual_items = 0

            for key, actual_list in actual_dict.items():
                if not isinstance(actual_list, list):
                    continue

                total_actual_items += len(actual_list)
                expected_list = expected.get(key, [])

                for item in actual_list:
                    if item not in expected_list:
                        hallucinated_items += 1

            return hallucinated_items / total_actual_items if total_actual_items > 0 else 0.0

        except (json.JSONDecodeError, AttributeError, TypeError):
            return 1.0 # Penalize unparseable output as hallucination/failure

    elif task_type == "narrative_risk_scoring":
        # Hallucination here would be returning something other than a number
        return 0.0 if str(actual).strip().isdigit() else 1.0

    elif task_type == "query_response":
        # Heuristic: if actual is significantly longer than expected, assume it might be hallucinating extra info
        expected_len = len(str(expected))
        actual_len = len(str(actual))

        if actual_len > expected_len * 1.5:
            # Calculate a penalty based on how much longer it is
            ratio = actual_len / expected_len
            penalty = (ratio - 1.5) / 2.0  # Scales from 0 to something positive
            return min(1.0, penalty)
        return 0.0

    return 0.0

def calculate_consistency(model_responses, task_id):
    """
    Consistency is generally calculated over multiple runs.
    For this static mock harness, we'll return a fixed high score
    since our mock responses don't vary.
    """
    return 1.0
