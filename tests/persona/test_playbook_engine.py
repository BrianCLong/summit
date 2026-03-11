import pytest
from summit.persona.playbooks import PersonaCampaignPlaybookTemplate, StepType
from summit.persona.playbook_engine import PlaybookEngine, PersonaHypothesis, PlatformAccount, CampaignContext

def test_playbook_engine_matching():
    # Setup the engine and override templates dir to our dummy dir
    engine = PlaybookEngine()

    # Create a synthetic persona hypothesis that matches EXECUTIVE_BRAND_PERSONA_ARMY_DEFENSE
    persona = PersonaHypothesis(
        persona_id="P123",
        risk_level="HIGH",
        deception_profile="LOW",
        platform_accounts=[
            PlatformAccount(platform="linkedin", account_id="li1", username="exec_bot_li"),
            PlatformAccount(platform="twitter", account_id="tw1", username="exec_bot_tw")
        ]
    )
    campaign = CampaignContext(campaign_id="C456", narrative_type="executive-targeting")

    instances = engine.plan_playbooks_for_persona(persona, campaign)

    # We expect at least one match for the Executive template
    assert len(instances) >= 1

    # Check that it instantiated the correct one
    executive_instance = next((inst for inst in instances if inst.template_id == "EXECUTIVE_BRAND_PERSONA_ARMY_DEFENSE"), None)
    assert executive_instance is not None
    assert executive_instance.persona_id == "P123"
    assert executive_instance.campaign_id == "C456"

def test_step_expansion_and_scores():
    engine = PlaybookEngine()

    persona = PersonaHypothesis(
        persona_id="P999",
        risk_level="CRITICAL",
        platform_accounts=[
            PlatformAccount(platform="facebook", account_id="fb1", username="fake_news_fb"),
            PlatformAccount(platform="twitter", account_id="tw1", username="fake_news_tw"),
            PlatformAccount(platform="reddit", account_id="rd1", username="fake_news_rd"),
        ]
    )
    campaign = CampaignContext(campaign_id="C789", narrative_type="election-interference")

    instances = engine.plan_playbooks_for_persona(persona, campaign)
    assert len(instances) >= 1

    election_instance = next((inst for inst in instances if inst.template_id == "ELECTION_INFO_SPACE_INTRUSION_DEFENSE"), None)
    assert election_instance is not None

    # Check that phases are populated and steps have default PLANNED status
    assert len(election_instance.phases.OBSERVE) > 0
    assert election_instance.phases.OBSERVE[0].status == "PLANNED"

    # Verify scores are populated
    assert election_instance.urgency == "CRITICAL"
    assert election_instance.complexity in ["LOW", "MEDIUM", "HIGH"]
    assert 0.0 <= election_instance.automation_coverage <= 1.0
