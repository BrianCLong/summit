from ai_front_door.gateway import AIGateway
from ai_front_door.policy_engine import PolicyEngine


def test_policy_allows_known_safe_case() -> None:
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
            'actor': 'compliance_analyst',
            'intent': 'summarize_policy',
            'text': 'Summarize this SOC2 policy update.',
        },
        evidence_id='EVID-AFD-20260226-0001',
    )

    assert result.decision.decision == 'ALLOW'
    assert result.report['decision'] == 'ALLOW'
    assert result.report['evidence_id'] == 'EVID-AFD-20260226-0001'
    assert result.report['rule_id'] == 'RULE-ALLOW-COMPLIANCE-SUMMARY'
