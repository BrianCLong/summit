import json

from runtime.spar.controller import AgentController
from runtime.spar.executor import TmuxCommandBuilder
from runtime.spar.types import Task


def test_goal_runs_in_parallel_and_writes_artifacts(tmp_path):
    controller = AgentController()
    controller.monitor.artifact_dir = tmp_path

    record, artifacts = controller.run_goal('build API prototype')

    assert len(record.tasks) == 3
    assert len(record.results) == 3
    assert all(result.status == 'completed' for result in record.results)

    run = json.loads(tmp_path.joinpath('run.json').read_text(encoding='utf-8'))
    metrics = json.loads(tmp_path.joinpath('metrics.json').read_text(encoding='utf-8'))
    stamp = json.loads(tmp_path.joinpath('stamp.json').read_text(encoding='utf-8'))

    assert run['goal'] == 'build API prototype'
    assert metrics['task_count'] == 3
    assert stamp['schema'] == 'spar.v1'
    assert set(artifacts.keys()) == {'run', 'metrics', 'stamp'}


def test_tmux_builder_rejects_unsafe_commands():
    builder = TmuxCommandBuilder()
    safe_task = Task('task-1', 'safe', 'execute:plan safe goal', 2, 1)
    assert builder.build(safe_task, 'worker1')[0] == 'tmux'

    unsafe_task = Task('task-2', 'unsafe', 'execute:plan; rm -rf /', 2, 1)
    try:
        builder.build(unsafe_task, 'worker2')
    except ValueError as err:
        assert 'Unsafe task command' in str(err)
    else:
        raise AssertionError('Expected unsafe command to be rejected')
