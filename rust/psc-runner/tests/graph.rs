use psc_runner::graph::{
    ConnectedComponent, GraphAnalyticsEngine, GraphAnalyticsRequest, GraphEdge, GraphInput,
    GraphNode, PageRankOptions, ShortestPathResult,
};

fn demo_graph() -> GraphAnalyticsEngine {
    let graph = GraphInput {
        nodes: vec![
            GraphNode { id: "A".into() },
            GraphNode { id: "B".into() },
            GraphNode { id: "C".into() },
            GraphNode { id: "D".into() },
        ],
        edges: vec![
            GraphEdge {
                from: "A".into(),
                to: "B".into(),
                weight: 1.0,
                bidirectional: true,
            },
            GraphEdge {
                from: "B".into(),
                to: "C".into(),
                weight: 2.0,
                bidirectional: true,
            },
            GraphEdge {
                from: "A".into(),
                to: "D".into(),
                weight: 10.0,
                bidirectional: true,
            },
        ],
    };

    GraphAnalyticsEngine::try_from_input(graph).expect("graph builds")
}

#[test]
fn computes_shortest_path() {
    let engine = demo_graph();
    let result = engine
        .shortest_path("A", "C")
        .expect("shortest path computed");
    assert_eq!(
        result,
        ShortestPathResult {
            cost: 3.0,
            path: vec!["A".into(), "B".into(), "C".into()]
        }
    );
}

#[test]
fn pagerank_converges_and_orders_scores() {
    let engine = demo_graph();
    let scores = engine
        .page_rank(PageRankOptions {
            damping: 0.85,
            tolerance: 1e-6,
            max_iterations: 200,
        })
        .expect("pagerank completes");

    assert_eq!(scores.len(), 4);
    assert!(scores[0].score >= scores[1].score);
    let sum: f64 = scores.iter().map(|s| s.score).sum();
    assert!((sum - 1.0).abs() < 0.05);
}

#[test]
fn finds_connected_components() {
    let mut engine = demo_graph();
    let request = GraphAnalyticsRequest::ConnectedComponents;
    let response = engine.execute(request).expect("components computed");

    match response {
        psc_runner::graph::GraphAnalyticsResponse::ConnectedComponents { components } => {
            assert_eq!(components.len(), 1);
            assert_eq!(
                components[0],
                ConnectedComponent {
                    nodes: vec!["A".into(), "B".into(), "C".into(), "D".into()]
                }
            );
        }
        _ => panic!("unexpected response"),
    }
}
