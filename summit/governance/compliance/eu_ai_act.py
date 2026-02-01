def check_record_keeping(events: list) -> dict:
    return {
        "article_12_compliant": len(events) > 0,
        "traceability": True
    }
