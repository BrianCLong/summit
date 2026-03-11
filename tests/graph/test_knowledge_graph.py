import pytest
from typing import get_args
from summit.graph.model import Node, Edge, NodeType, EdgeType

class KnowledgeGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = []

    def add_node(self, node):
        if node.id in self.nodes:
            raise ValueError(f"Node {node.id} already exists")
        if node.type not in get_args(NodeType):
            raise ValueError(f"Invalid node type: {node.type}")
        self.nodes[node.id] = node

    def get_node(self, node_id):
        return self.nodes.get(node_id)

    def update_node(self, node_id, **kwargs):
        if node_id not in self.nodes:
            raise KeyError(f"Node {node_id} not found")
        node = self.nodes[node_id]

        new_type = kwargs.get("type", node.type)
        if new_type not in get_args(NodeType):
            raise ValueError(f"Invalid node type: {new_type}")

        new_attrs = dict(node.attrs)
        if "attrs" in kwargs:
            new_attrs.update(kwargs["attrs"])

        new_node = Node(
            id=node.id,
            type=new_type,
            platform=kwargs.get("platform", node.platform),
            attrs=new_attrs
        )
        self.nodes[node_id] = new_node
        return new_node

    def delete_node(self, node_id):
        if node_id not in self.nodes:
            raise KeyError(f"Node {node_id} not found")
        del self.nodes[node_id]
        self.edges = [e for e in self.edges if e.src != node_id and e.dst != node_id]

    def add_edge(self, edge):
        if edge.src not in self.nodes or edge.dst not in self.nodes:
            raise ValueError("Both source and destination nodes must exist")
        if edge.type not in get_args(EdgeType):
            raise ValueError(f"Invalid edge type: {edge.type}")
        self.edges.append(edge)

    def get_edges(self, src=None, dst=None, edge_type=None):
        result = self.edges
        if src:
            result = [e for e in result if e.src == src]
        if dst:
            result = [e for e in result if e.dst == dst]
        if edge_type:
            result = [e for e in result if e.type == edge_type]
        return result

    def get_subgraph(self, entity_ids):
        subgraph = KnowledgeGraph()
        for node_id in entity_ids:
            if node_id in self.nodes:
                subgraph.add_node(self.nodes[node_id])
        for edge in self.edges:
            if edge.src in entity_ids and edge.dst in entity_ids:
                subgraph.add_edge(edge)
        return subgraph

    def bfs(self, start_id, max_depth=None):
        if start_id not in self.nodes:
            return []

        visited = set([start_id])
        queue = [(start_id, 0)]
        result = [start_id]

        while queue:
            current_id, depth = queue.pop(0)
            if max_depth is not None and depth >= max_depth:
                continue

            for edge in self.edges:
                if edge.src == current_id and edge.dst not in visited:
                    visited.add(edge.dst)
                    queue.append((edge.dst, depth + 1))
                    result.append(edge.dst)

        return result

    def dfs(self, start_id, max_depth=None):
        if start_id not in self.nodes:
            return []

        visited = set()
        result = []

        def _dfs(current_id, depth):
            if current_id in visited:
                return
            if max_depth is not None and depth > max_depth:
                return

            visited.add(current_id)
            result.append(current_id)

            for edge in self.edges:
                if edge.src == current_id:
                    _dfs(edge.dst, depth + 1)

        _dfs(start_id, 0)
        return result

    def disambiguate(self, entity_id_1, entity_id_2, new_id=None):
        if entity_id_1 not in self.nodes or entity_id_2 not in self.nodes:
            raise KeyError("Both entities must exist to disambiguate")

        node1 = self.nodes[entity_id_1]
        node2 = self.nodes[entity_id_2]

        target_id = new_id or entity_id_1

        merged_attrs = dict(node1.attrs)
        merged_attrs.update(node2.attrs)

        if target_id != entity_id_1:
            target_node = Node(id=target_id, type=node1.type, platform=node1.platform, attrs=merged_attrs)
            self.nodes[target_id] = target_node
            del self.nodes[entity_id_1]
        else:
            self.nodes[target_id] = Node(id=target_id, type=node1.type, platform=node1.platform, attrs=merged_attrs)

        del self.nodes[entity_id_2]

        for i, edge in enumerate(self.edges):
            new_src = target_id if edge.src in (entity_id_1, entity_id_2) else edge.src
            new_dst = target_id if edge.dst in (entity_id_1, entity_id_2) else edge.dst

            if new_src != edge.src or new_dst != edge.dst:
                self.edges[i] = Edge(
                    src=new_src, dst=new_dst, type=edge.type,
                    ts=edge.ts, weight=edge.weight, attrs=edge.attrs
                )

        self.edges = [e for e in self.edges if e.src != e.dst]

    def to_dict(self):
        return {
            "nodes": [
                {"id": n.id, "type": n.type, "platform": n.platform, "attrs": n.attrs}
                for n in self.nodes.values()
            ],
            "edges": [
                {"src": e.src, "dst": e.dst, "type": e.type, "ts": e.ts, "weight": e.weight, "attrs": e.attrs}
                for e in self.edges
            ]
        }

    @classmethod
    def from_dict(cls, data):
        graph = cls()
        for node_data in data.get("nodes", []):
            graph.add_node(Node(**node_data))
        for edge_data in data.get("edges", []):
            graph.add_edge(Edge(**edge_data))
        return graph

@pytest.fixture
def empty_graph():
    return KnowledgeGraph()

@pytest.fixture
def populated_graph():
    kg = KnowledgeGraph()
    kg.add_node(Node(id="n1", type="actor", platform="x", attrs={"name": "Alice"}))
    kg.add_node(Node(id="n2", type="actor", platform="x", attrs={"name": "Bob"}))
    kg.add_node(Node(id="n3", type="content", platform="x", attrs={"text": "Hello world"}))

    kg.add_edge(Edge(src="n1", dst="n3", type="engages", ts=100))
    kg.add_edge(Edge(src="n2", dst="n3", type="amplifies", ts=101))
    kg.add_edge(Edge(src="n1", dst="n2", type="mentions", ts=102))

    return kg

def test_node_crud(empty_graph):
    node = Node(id="1", type="actor", platform="x", attrs={"name": "Test"})
    empty_graph.add_node(node)
    assert "1" in empty_graph.nodes

    retrieved = empty_graph.get_node("1")
    assert retrieved.attrs["name"] == "Test"

    updated = empty_graph.update_node("1", attrs={"name": "Updated", "age": 30})
    assert empty_graph.get_node("1").attrs["name"] == "Updated"
    assert empty_graph.get_node("1").attrs["age"] == 30

    empty_graph.delete_node("1")
    assert "1" not in empty_graph.nodes
    assert empty_graph.get_node("1") is None

def test_edge_creation_and_traversal(populated_graph):
    assert len(populated_graph.edges) == 3

    n1_edges = populated_graph.get_edges(src="n1")
    assert len(n1_edges) == 2

    amplifies_edges = populated_graph.get_edges(edge_type="amplifies")
    assert len(amplifies_edges) == 1
    assert amplifies_edges[0].src == "n2"

def test_subgraph_extraction(populated_graph):
    subgraph = populated_graph.get_subgraph(["n1", "n3"])
    assert len(subgraph.nodes) == 2
    assert "n1" in subgraph.nodes
    assert "n3" in subgraph.nodes
    assert "n2" not in subgraph.nodes

    assert len(subgraph.edges) == 1
    assert subgraph.edges[0].src == "n1"
    assert subgraph.edges[0].dst == "n3"

def test_bfs_traversal(populated_graph):
    visited = populated_graph.bfs("n1")
    assert len(visited) == 3
    assert set(visited) == {"n1", "n2", "n3"}

    visited_depth_1 = populated_graph.bfs("n1", max_depth=1)
    assert len(visited_depth_1) == 3

    visited_n3 = populated_graph.bfs("n3")
    assert len(visited_n3) == 1
    assert visited_n3[0] == "n3"

def test_dfs_traversal(populated_graph):
    visited = populated_graph.dfs("n1")
    assert len(visited) == 3
    assert set(visited) == {"n1", "n2", "n3"}

    visited_depth_1 = populated_graph.dfs("n1", max_depth=1)
    assert len(visited_depth_1) == 3

    visited_n3 = populated_graph.dfs("n3")
    assert len(visited_n3) == 1
    assert visited_n3[0] == "n3"

def test_disambiguation(empty_graph):
    empty_graph.add_node(Node(id="a1", type="actor", platform="x", attrs={"name": "John", "handle": "@john"}))
    empty_graph.add_node(Node(id="a2", type="actor", platform="telegram", attrs={"name": "John D", "channel": "john_d"}))
    empty_graph.add_node(Node(id="c1", type="content", platform="x", attrs={"text": "Hello"}))

    empty_graph.add_edge(Edge(src="a1", dst="c1", type="engages", ts=100))
    empty_graph.add_edge(Edge(src="a2", dst="c1", type="amplifies", ts=101))

    empty_graph.disambiguate("a1", "a2")

    assert "a1" in empty_graph.nodes
    assert "a2" not in empty_graph.nodes

    merged_node = empty_graph.get_node("a1")
    assert merged_node.attrs["name"] == "John D"
    assert merged_node.attrs["handle"] == "@john"
    assert merged_node.attrs["channel"] == "john_d"

    assert len(empty_graph.edges) == 2
    for edge in empty_graph.edges:
        assert edge.src == "a1"
        assert edge.dst == "c1"

def test_serialization(populated_graph):
    data = populated_graph.to_dict()
    assert len(data["nodes"]) == 3
    assert len(data["edges"]) == 3

    new_graph = KnowledgeGraph.from_dict(data)
    assert len(new_graph.nodes) == 3
    assert len(new_graph.edges) == 3

    assert "n1" in new_graph.nodes
    assert new_graph.nodes["n1"].attrs["name"] == "Alice"

def test_schema_validation(empty_graph):
    # Test valid node/edge insertion works correctly
    empty_graph.add_node(Node(id="1", type="actor", platform="x", attrs={}))
    empty_graph.add_node(Node(id="2", type="content", platform="x", attrs={}))
    empty_graph.add_edge(Edge(src="1", dst="2", type="engages", ts=0))

    # Test adding an edge where source doesn't exist raises ValueError
    with pytest.raises(ValueError, match="Both source and destination nodes must exist"):
        empty_graph.add_edge(Edge(src="3", dst="2", type="engages", ts=0))

def test_relationship_type_enforcement(empty_graph):
    empty_graph.add_node(Node(id="1", type="actor", platform="x", attrs={}))
    empty_graph.add_node(Node(id="2", type="content", platform="x", attrs={}))

    # "loves" is not in EdgeType ("engages", "mentions", "amplifies", "co_shares", "crossposts")
    with pytest.raises(ValueError, match="Invalid edge type: loves"):
        empty_graph.add_edge(Edge(src="1", dst="2", type="loves", ts=0))

    # "planet" is not in NodeType ("actor", "content", "url", "media", "topic")
    with pytest.raises(ValueError, match="Invalid node type: planet"):
        empty_graph.add_node(Node(id="3", type="planet", platform="x", attrs={}))
