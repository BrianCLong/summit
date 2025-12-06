from auto_scientist.graph import ExperimentGraph, Node, Edge, NodeType, EdgeType

def test_add_node():
    graph = ExperimentGraph()
    node = Node.new(NodeType.HYPOTHESIS, {"text": "A new idea"})
    graph.add_node(node)
    assert node.id in graph.nodes
    assert graph.nodes[node.id] == node

def test_add_edge():
    graph = ExperimentGraph()
    node1 = Node.new(NodeType.HYPOTHESIS, {})
    node2 = Node.new(NodeType.DATASET, {})
    graph.add_node(node1)
    graph.add_node(node2)
    edge = Edge(source=node1.id, target=node2.id, type=EdgeType.DEPENDS_ON)
    graph.add_edge(edge)
    assert edge in graph.edges

def test_successors_predecessors():
    graph = ExperimentGraph()
    h = Node.new(NodeType.HYPOTHESIS, {})
    d = Node.new(NodeType.DATASET, {})
    r = Node.new(NodeType.TRAIN_RUN, {})
    graph.add_node(h)
    graph.add_node(d)
    graph.add_node(r)
    graph.add_edge(Edge(source=h.id, target=r.id, type=EdgeType.DEPENDS_ON))
    graph.add_edge(Edge(source=d.id, target=r.id, type=EdgeType.DEPENDS_ON))

    successors = list(graph.successors(h.id))
    assert len(successors) == 1
    assert successors[0] == r

    predecessors = list(graph.predecessors(r.id))
    assert len(predecessors) == 2
    assert h in predecessors
    assert d in predecessors

def test_nodes_by_type():
    graph = ExperimentGraph()
    h1 = Node.new(NodeType.HYPOTHESIS, {})
    h2 = Node.new(NodeType.HYPOTHESIS, {})
    d1 = Node.new(NodeType.DATASET, {})
    graph.add_node(h1)
    graph.add_node(h2)
    graph.add_node(d1)

    hypotheses = list(graph.nodes_by_type(NodeType.HYPOTHESIS))
    datasets = list(graph.nodes_by_type(NodeType.DATASET))

    assert len(hypotheses) == 2
    assert h1 in hypotheses
    assert h2 in hypotheses
    assert len(datasets) == 1
    assert d1 in datasets
