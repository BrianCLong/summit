#!/usr/bin/env python3
"""Hyperparameter optimization using Optuna for IntelGraph models."""

import json
import logging
import os
import random
import sys
from typing import Any, Dict

import numpy as np
from sklearn.model_selection import train_test_split

try:
    import optuna  # type: ignore
except ImportError:  # pragma: no cover - fallback when optuna missing
    optuna = None

# Ensure local imports work regardless of invocation path
sys.path.append(os.path.dirname(__file__))
from train_model import ModelTrainer  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_request(path: str) -> Dict[str, Any]:
    with open(path, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def sample_from_space(space: Dict[str, Any]) -> Dict[str, Any]:
    params: Dict[str, Any] = {}
    for name, definition in space.items():
        kind = definition.get('type')
        if kind == 'int':
            step = definition.get('step', 1)
            params[name] = random.randrange(
                int(definition['min']), int(definition['max']) + step, step
            )
        elif kind == 'float':
            if definition.get('log'):
                params[name] = float(
                    np.exp(
                        random.uniform(
                            np.log(definition['min']), np.log(definition['max'])
                        )
                    )
                )
            else:
                params[name] = random.uniform(definition['min'], definition['max'])
        elif kind == 'categorical':
            params[name] = random.choice(definition['choices'])
    return params


def suggest_from_space(trial: 'optuna.trial.Trial', space: Dict[str, Any]) -> Dict[str, Any]:
    params: Dict[str, Any] = {}
    for name, definition in space.items():
        kind = definition.get('type')
        if kind == 'int':
            params[name] = trial.suggest_int(
                name,
                int(definition['min']),
                int(definition['max']),
                definition.get('step'),
            )
        elif kind == 'float':
            params[name] = trial.suggest_float(
                name,
                float(definition['min']),
                float(definition['max']),
                log=bool(definition.get('log')),
            )
        elif kind == 'categorical':
            params[name] = trial.suggest_categorical(name, definition['choices'])
    return params


def optimise_with_optuna(
    trainer: ModelTrainer,
    data: Dict[str, Any],
    X_train: np.ndarray,
    X_valid: np.ndarray,
    y_train: np.ndarray,
    y_valid: np.ndarray,
) -> Dict[str, Any]:
    search_space = data.get('searchSpace', {})
    model_type = data['modelType']
    n_trials = int(data.get('nTrials', 25))
    timeout = data.get('timeoutSeconds')

    if not search_space:
        logger.warning('Empty search space provided; falling back to defaults')
        search_space = {}

    def objective(trial: 'optuna.trial.Trial') -> float:
        params = suggest_from_space(trial, search_space)
        pipeline = trainer.train_model(X_train, y_train, model_type, params)
        metrics = trainer.evaluate_model(pipeline, X_valid, y_valid)
        trial.set_user_attr('metrics', metrics)
        return metrics['f1Score']

    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=n_trials, timeout=timeout)
    best_trial = study.best_trial
    metrics = best_trial.user_attrs.get('metrics')

    return {
        'best_hyperparameters': best_trial.params,
        'best_metrics': metrics,
        'trials': len(study.trials),
        'study_summary': {
            'best_value': study.best_value,
            'duration_seconds': best_trial.duration.total_seconds()
            if best_trial.duration
            else None,
        },
    }


def optimise_with_random_search(
    trainer: ModelTrainer,
    data: Dict[str, Any],
    X_train: np.ndarray,
    X_valid: np.ndarray,
    y_train: np.ndarray,
    y_valid: np.ndarray,
) -> Dict[str, Any]:
    logger.warning('Optuna unavailable, using random search fallback')
    search_space = data.get('searchSpace', {})
    model_type = data['modelType']
    n_trials = int(data.get('nTrials', 10))

    best_score = -1.0
    best_params: Dict[str, Any] = {}
    best_metrics: Dict[str, Any] = {}

    for _ in range(n_trials):
        params = sample_from_space(search_space)
        pipeline = trainer.train_model(X_train, y_train, model_type, params)
        metrics = trainer.evaluate_model(pipeline, X_valid, y_valid)
        if metrics['f1Score'] > best_score:
            best_score = metrics['f1Score']
            best_params = params
            best_metrics = metrics

    return {
        'best_hyperparameters': best_params,
        'best_metrics': best_metrics,
        'trials': n_trials,
        'study_summary': {'best_value': best_score},
    }


def main() -> int:
    if len(sys.argv) != 3:
        print('Usage: optimize_hyperparameters.py <input> <output>')
        return 1

    input_path, output_path = sys.argv[1:3]

    try:
        request = load_request(input_path)
        trainer = ModelTrainer()

        examples = request.get('examples', [])
        if not examples:
            raise ValueError('No training examples provided for optimization')

        X, y = trainer.prepare_data(examples)
        X_train, X_valid, y_train, y_valid = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y if len(np.unique(y)) > 1 else None,
        )

        if optuna is not None:
            result = optimise_with_optuna(
                trainer, request, X_train, X_valid, y_train, y_valid
            )
        else:
            result = optimise_with_random_search(
                trainer, request, X_train, X_valid, y_train, y_valid
            )

        # Ensure best metrics present
        if not result.get('best_metrics'):
            pipeline = trainer.train_model(
                X_train, y_train, request['modelType'], result['best_hyperparameters']
            )
            result['best_metrics'] = trainer.evaluate_model(
                pipeline, X_valid, y_valid
            )

        with open(output_path, 'w', encoding='utf-8') as handle:
            json.dump(result, handle, indent=2)

        logger.info('Hyperparameter optimization completed')
        return 0
    except Exception as exc:  # pragma: no cover - runtime protection
        logger.error('Hyperparameter optimization failed: %s', exc)
        error_payload = {
            'error': str(exc),
            'best_hyperparameters': {},
            'best_metrics': {
                'accuracy': 0.0,
                'precision': 0.0,
                'recall': 0.0,
                'f1Score': 0.0,
            },
            'trials': 0,
            'study_summary': {},
        }
        with open(output_path, 'w', encoding='utf-8') as handle:
            json.dump(error_payload, handle, indent=2)
        return 1


if __name__ == '__main__':
    sys.exit(main())
