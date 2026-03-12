import hashlib
import os
from collections import Counter
from typing import Any

FEATURE_FLAG = 'COGWAR_INNOVATION'
_ALLOWED_STANCES = {'defensive', 'neutral'}


def _require_feature_enabled() -> None:
    if os.environ.get(FEATURE_FLAG, 'false').lower() != 'true':
        raise PermissionError(f'Feature {FEATURE_FLAG} is disabled.')


def _normalize_text(value: Any) -> str:
    if not isinstance(value, str):
        return ''
    return ' '.join(value.lower().strip().split())


def _tokenize(text: str) -> list[str]:
    return [token for token in text.replace('.', ' ').replace(',', ' ').split() if len(token) > 2]


def _stable_hash(payload: str) -> str:
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def synthesize_cognitive_shield(
    observations: list[dict[str, Any]],
    *,
    objective: str = 'stabilize-public-understanding',
) -> dict[str, Any]:
    """
    Deterministic defensive planner that converts narrative observations into
    a ranked countermeasure portfolio.
    """
    _require_feature_enabled()

    if objective not in {
        'stabilize-public-understanding',
        'reduce-synthetic-amplification',
        'improve-source-trust-calibration',
    }:
        raise ValueError('Objective is not permitted by defensive policy.')

    if not observations:
        raise ValueError('At least one observation is required.')

    normalized: list[dict[str, Any]] = []
    channels = Counter()
    stances = Counter()
    token_counter = Counter()

    for idx, item in enumerate(observations):
        stance = _normalize_text(item.get('stance', 'neutral'))
        if stance not in _ALLOWED_STANCES:
            raise PermissionError('Offensive or manipulative stance is not allowed.')

        narrative = _normalize_text(item.get('narrative', ''))
        if not narrative:
            raise ValueError(f'Observation at index {idx} has no narrative.')

        channel = _normalize_text(item.get('channel', 'unknown')) or 'unknown'
        severity = float(item.get('severity', 0.5))
        severity = min(1.0, max(0.0, severity))

        channels[channel] += 1
        stances[stance] += 1
        token_counter.update(_tokenize(narrative))

        normalized.append(
            {
                'id': _normalize_text(item.get('id', f'obs-{idx + 1}')) or f'obs-{idx + 1}',
                'narrative': narrative,
                'channel': channel,
                'stance': stance,
                'severity': severity,
            }
        )

    dominant_channel, dominant_count = channels.most_common(1)[0]
    dominant_ratio = dominant_count / len(normalized)
    top_tokens = [tok for tok, _ in token_counter.most_common(5)]

    narrative_concentration = min(1.0, dominant_ratio + (len(top_tokens) / 20.0))
    synthetic_pressure_score = min(1.0, sum(item['severity'] for item in normalized) / len(normalized))
    trust_fragility_index = round((0.55 * narrative_concentration) + (0.45 * synthetic_pressure_score), 4)

    interventions: list[dict[str, Any]] = []

    def _add(name: str, kind: str, gain: float, rationale: str) -> None:
        interventions.append(
            {
                'countermeasure_id': _stable_hash(f'{name}|{kind}|{rationale}')[:12],
                'name': name,
                'kind': kind,
                'expected_stability_gain': round(min(1.0, max(0.0, gain)), 4),
                'rationale': rationale,
                'guardrails': [
                    'defensive-only',
                    'no-microtargeting',
                    'human-review-required-for-high-risk',
                ],
            }
        )

    _add(
        name='Narrative Friction Injection',
        kind='prebunk',
        gain=0.35 + (0.4 * trust_fragility_index),
        rationale=f'High concentration on {dominant_channel}; prime audiences with verification prompts.',
    )
    _add(
        name='Source Lineage Spotlight',
        kind='provenance',
        gain=0.25 + (0.45 * synthetic_pressure_score),
        rationale='Emphasize source lineage and authenticity checks for repeated claims.',
    )
    _add(
        name='Cross-Channel Context Bridge',
        kind='contextualization',
        gain=0.2 + (0.35 * narrative_concentration),
        rationale='Inject synchronized context cards to break reinforcement loops across channels.',
    )

    interventions.sort(
        key=lambda item: (
            -item['expected_stability_gain'],
            item['countermeasure_id'],
        )
    )

    top_intervention = interventions[0]
    shield_basis = '|'.join(
        [
            objective,
            dominant_channel,
            ','.join(top_tokens),
            str(len(normalized)),
            str(top_intervention['expected_stability_gain']),
        ]
    )

    return {
        'schema_version': 'cogwar.cognitive_shield_plan.v1',
        'shield_plan_id': f'CSP-{_stable_hash(shield_basis)[:16]}',
        'objective': objective,
        'summary': {
            'observation_count': len(normalized),
            'dominant_channel': dominant_channel,
            'dominant_channel_ratio': round(dominant_ratio, 4),
            'top_narrative_tokens': top_tokens,
            'trust_fragility_index': trust_fragility_index,
            'synthetic_pressure_score': round(synthetic_pressure_score, 4),
        },
        'interventions': interventions,
        'policy': {
            'mode': 'defensive',
            'requires_human_approval_above_gain': 0.7,
            'prohibited_actions': [
                'audience-manipulation',
                'psychographic-microtargeting',
                'offensive-influence-operations',
            ],
        },
    }
