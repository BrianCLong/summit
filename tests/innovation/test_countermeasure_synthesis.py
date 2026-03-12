import json
import os
from pathlib import Path

import pytest

from cogwar.innovation.countermeasure_synthesis import synthesize_cognitive_shield


def _with_flag() -> None:
    os.environ['COGWAR_INNOVATION'] = 'true'


def _without_flag() -> None:
    if 'COGWAR_INNOVATION' in os.environ:
        del os.environ['COGWAR_INNOVATION']


def _sample_observations() -> list[dict]:
    return [
        {
            'id': 'obs-1',
            'narrative': 'Unverified viral claim links outage to fabricated sabotage evidence.',
            'channel': 'social',
            'stance': 'defensive',
            'severity': 0.8,
        },
        {
            'id': 'obs-2',
            'narrative': 'Same claim repeated in forums with synthetic screenshots and no provenance.',
            'channel': 'forum',
            'stance': 'neutral',
            'severity': 0.6,
        },
        {
            'id': 'obs-3',
            'narrative': 'Cross-post amplification loop increases confusion around source authenticity.',
            'channel': 'social',
            'stance': 'defensive',
            'severity': 0.9,
        },
    ]


def test_countermeasure_synthesis_disabled_by_default() -> None:
    prev = os.environ.get('COGWAR_INNOVATION')
    _without_flag()

    try:
        with pytest.raises(PermissionError):
            synthesize_cognitive_shield(_sample_observations())
    finally:
        if prev is not None:
            os.environ['COGWAR_INNOVATION'] = prev


def test_countermeasure_synthesis_is_deterministic() -> None:
    prev = os.environ.get('COGWAR_INNOVATION')
    _with_flag()

    try:
        observations = _sample_observations()
        plan_a = synthesize_cognitive_shield(observations)
        plan_b = synthesize_cognitive_shield(observations)

        assert plan_a == plan_b
        assert plan_a['schema_version'] == 'cogwar.cognitive_shield_plan.v1'
        assert plan_a['policy']['mode'] == 'defensive'
        assert plan_a['interventions'][0]['expected_stability_gain'] >= plan_a['interventions'][1]['expected_stability_gain']
    finally:
        if prev is None:
            _without_flag()
        else:
            os.environ['COGWAR_INNOVATION'] = prev


def test_countermeasure_synthesis_schema_shape() -> None:
    prev = os.environ.get('COGWAR_INNOVATION')
    _with_flag()

    try:
        plan = synthesize_cognitive_shield(_sample_observations())
        schema = json.loads(Path('schemas/cogwar/cognitive_shield_plan.schema.json').read_text())

        assert plan['schema_version'] == schema['properties']['schema_version']['const']
        assert len(plan['interventions']) >= schema['properties']['interventions']['minItems']
        assert plan['summary']['observation_count'] >= schema['properties']['summary']['properties']['observation_count']['minimum']
        assert 0 <= plan['summary']['trust_fragility_index'] <= 1
        assert 0 <= plan['summary']['synthetic_pressure_score'] <= 1
    finally:
        if prev is None:
            _without_flag()
        else:
            os.environ['COGWAR_INNOVATION'] = prev


def test_countermeasure_synthesis_rejects_offensive_stance() -> None:
    prev = os.environ.get('COGWAR_INNOVATION')
    _with_flag()

    try:
        with pytest.raises(PermissionError):
            synthesize_cognitive_shield(
                [
                    {
                        'id': 'obs-1',
                        'narrative': 'Target a narrow group with persuasion sequence.',
                        'channel': 'social',
                        'stance': 'offensive',
                        'severity': 0.9,
                    }
                ]
            )
    finally:
        if prev is None:
            _without_flag()
        else:
            os.environ['COGWAR_INNOVATION'] = prev
