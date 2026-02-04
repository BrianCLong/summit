from pathlib import Path

from graph_validator.config.mapping import load_mapping


def test_load_mapping_example() -> None:
    mapping_path = Path('tools/graph_validator/graph_validator/fixtures/mapping.example.yml')
    mapping = load_mapping(mapping_path)
    assert mapping.version == 1
    assert mapping.entities
    assert mapping.seed == 'summit-gv2'
