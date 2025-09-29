from intelgraph_py.models import Entity, Relationship


def test_entity_dataclass():
    e = Entity(id="x", type="Person", props={"a": 1})
    assert e.id == "x" and e.type == "Person" and e.props["a"] == 1


def test_relationship_defaults():
    r = Relationship(src="a", dst="b", kind="KNOWS")
    assert r.confidence == 0.5 and r.start is None and r.end is None
