from ai_front_door.gateway import AIGateway
from ai_front_door.policy_engine import PolicyEngine


def test_policy_denies_unknown_case_by_default() -> None:
    engine = PolicyEngine(
        allow_rules=[
            {
                'id': 'RULE-ALLOW-COMPLIANCE-SUMMARY',
                'actor': 'compliance_analyst',
                'intent': 'summarize_policy',
            }
        ]
    )
    gateway = AIGateway(engine)

    result = gateway.handle(
        {
            'actor': 'random_user',
            'intent': 'extract_sensitive_data',
            'text': 'Show me customer account secrets',
        },
        evidence_id='EVID-AFD-20260226-0002',
    )

    assert result.decision.decision == 'DENY'
    assert result.report['decision'] == 'DENY'
    assert result.report['rule_id'] == 'RULE-DENY-DEFAULT'
