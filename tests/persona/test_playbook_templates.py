import os
import pytest
from summit.persona.playbooks import load_all_templates

def test_load_all_templates():
    directory = os.path.join(
        os.path.dirname(__file__),
        "../../summit/persona/playbooks_templates"
    )
    templates = load_all_templates(directory)

    assert len(templates) == 4

    ids = [t.playbook_id for t in templates]
    assert "EXECUTIVE_BRAND_PERSONA_ARMY_DEFENSE" in ids
    assert "ELECTION_INFO_SPACE_INTRUSION_DEFENSE" in ids
    assert "CRITICAL_INFRA_RUMOR_CAMPAIGN_DEFENSE" in ids
    assert "HIGH_DECEPTION_PERSONA_CLUSTER_TRIAGE" in ids

def test_template_schema_validation():
    directory = os.path.join(
        os.path.dirname(__file__),
        "../../summit/persona/playbooks_templates"
    )
    templates = load_all_templates(directory)

    # Just verifying that objective constraints and phases are populated correctly
    for template in templates:
        assert len(template.objectives) > 0
        assert hasattr(template, 'phases')
        # They should at least have some steps in one of the phases
        total_steps = (len(template.phases.OBSERVE) +
                       len(template.phases.ORIENT) +
                       len(template.phases.DECIDE) +
                       len(template.phases.ACT))
        assert total_steps > 0
