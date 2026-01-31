from summit.active_measures.policy import check_investigative_support_only, check_never_log_fields


def test_deny_forbidden_actions():
    d = check_investigative_support_only(["takedown"])
    assert not d.allowed
    assert d.reason == "forbidden_action"

def test_allow_investigative_actions():
    d = check_investigative_support_only(["rank_leads", "export_evidence"])
    assert d.allowed
    assert d.reason == "ok"

def test_deny_never_log_fields():
    d = check_never_log_fields(["raw_post_text"])
    assert not d.allowed
    assert d.reason == "never_log_field_present"

def test_allow_safe_fields():
    d = check_never_log_fields(["hashed_user_id", "score"])
    assert d.allowed
    assert d.reason == "ok"
