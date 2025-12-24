use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet};

use serde::{Deserialize, Serialize};
use thiserror::Error;

fn default_weight() -> f64 {
    1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
    #[serde(default = "default_weight")]
    pub weight: f64,
    #[serde(default)]
    pub bidirectional: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphInput {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Error)]
pub enum GraphError {
    #[error("graph contains duplicate node id {0}")]
    DuplicateNode(String),
    #[error("edge references unknown node {0}")]
    UnknownNode(String),
    #[error("graph is empty")]
    Empty,
    #[error("start node {0} missing from graph")]
    MissingStart(String),
    #[error("end node {0} missing from graph")]
    MissingEnd(String),
    #[error("no path found between {start} and {end}")]
    NoPath { start: String, end: String },
    #[error("invalid parameter: {0}")]
    InvalidParameter(String),
}

#[derive(Debug, Clone)]
pub struct Graph {
    adjacency: HashMap<String, Vec<(String, f64)>>,
    undirected_adjacency: HashMap<String, Vec<(String, f64)>>,
}

impl Graph {
    pub fn try_from_input(input: GraphInput) -> Result<Self, GraphError> {
        if input.nodes.is_empty() {
            return Err(GraphError::Empty);
        }

        let mut adjacency: HashMap<String, Vec<(String, f64)>> = HashMap::new();
        let mut undirected: HashMap<String, Vec<(String, f64)>> = HashMap::new();

        for node in &input.nodes {
            if adjacency.contains_key(&node.id) {
                return Err(GraphError::DuplicateNode(node.id.clone()));
            }
            adjacency.insert(node.id.clone(), Vec::new());
            undirected.insert(node.id.clone(), Vec::new());
        }

        for edge in &input.edges {
            if !adjacency.contains_key(&edge.from) {
                return Err(GraphError::UnknownNode(edge.from.clone()));
            }
            if !adjacency.contains_key(&edge.to) {
                return Err(GraphError::UnknownNode(edge.to.clone()));
            }
            if edge.weight <= 0.0 || !edge.weight.is_finite() {
                return Err(GraphError::InvalidParameter(format!(
                    "edge weight must be positive and finite for {} -> {}",
                    edge.from, edge.to
                )));
            }
            adjacency
                .get_mut(&edge.from)
                .expect("validated existence")
                .push((edge.to.clone(), edge.weight));
            undirected
                .get_mut(&edge.from)
                .expect("validated existence")
                .push((edge.to.clone(), edge.weight));
            undirected
                .get_mut(&edge.to)
                .expect("validated existence")
                .push((edge.from.clone(), edge.weight));
            if edge.bidirectional {
                adjacency
                    .get_mut(&edge.to)
                    .expect("validated existence")
                    .push((edge.from.clone(), edge.weight));
            }
        }

        Ok(Self {
            adjacency,
            undirected_adjacency: undirected,
        })
    }

    pub fn neighbors(&self, node: &str) -> Option<&Vec<(String, f64)>> {
        self.adjacency.get(node)
    }

    pub fn undirected_neighbors(&self, node: &str) -> Option<&Vec<(String, f64)>> {
        self.undirected_adjacency.get(node)
    }

    pub fn nodes(&self) -> impl Iterator<Item = &String> {
        self.adjacency.keys()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ShortestPathResult {
    pub cost: f64,
    pub path: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageRankOptions {
    pub damping: f64,
    pub tolerance: f64,
    pub max_iterations: usize,
}

impl Default for PageRankOptions {
    fn default() -> Self {
        Self {
            damping: 0.85,
            tolerance: 1e-6,
            max_iterations: 100,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PageRankScore {
    pub node: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ConnectedComponent {
    pub nodes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "algorithm", rename_all = "kebab-case")]
pub enum GraphAnalyticsResponse {
    ShortestPath { result: ShortestPathResult },
    PageRank { scores: Vec<PageRankScore> },
    ConnectedComponents { components: Vec<ConnectedComponent> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "algorithm", rename_all = "kebab-case")]
pub enum GraphAnalyticsRequest {
    ShortestPath {
        start: String,
        end: String,
    },
    PageRank {
        damping: f64,
        tolerance: f64,
        max_iterations: usize,
    },
    ConnectedComponents,
}

pub struct GraphAnalyticsEngine {
    graph: Graph,
}

impl GraphAnalyticsEngine {
    pub fn new(graph: Graph) -> Self {
        Self { graph }
    }

    pub fn try_from_input(input: GraphInput) -> Result<Self, GraphError> {
        Ok(Self::new(Graph::try_from_input(input)?))
    }

    pub fn shortest_path(&self, start: &str, end: &str) -> Result<ShortestPathResult, GraphError> {
        if !self.graph.adjacency.contains_key(start) {
            return Err(GraphError::MissingStart(start.to_string()));
        }
        if !self.graph.adjacency.contains_key(end) {
            return Err(GraphError::MissingEnd(end.to_string()));
        }

        let mut distances: HashMap<&str, f64> = self
            .graph
            .adjacency
            .keys()
            .map(|k| (k.as_str(), f64::INFINITY))
            .collect();
        let mut previous: HashMap<&str, &str> = HashMap::new();
        let mut heap = BinaryHeap::new();

        distances.insert(start, 0.0);
        heap.push(State {
            cost: 0.0,
            position: start.to_string(),
        });

        while let Some(State { cost, position }) = heap.pop() {
            if position == end {
                break;
            }

            if cost > *distances.get(position.as_str()).unwrap_or(&f64::INFINITY) {
                continue;
            }

            if let Some(neighbors) = self.graph.neighbors(&position) {
                for (neighbor, weight) in neighbors {
                    let next_cost = cost + weight;
                    let current = distances
                        .get(neighbor.as_str())
                        .copied()
                        .unwrap_or(f64::INFINITY);
                    if next_cost < current {
                        distances.insert(neighbor, next_cost);
                        previous.insert(neighbor, position.as_str());
                        heap.push(State {
                            cost: next_cost,
                            position: neighbor.clone(),
                        });
                    }
                }
            }
        }

        if !previous.contains_key(end) && start != end {
            return Err(GraphError::NoPath {
                start: start.to_string(),
                end: end.to_string(),
            });
        }

        let mut path = Vec::new();
        let mut current = end;
        path.push(current.to_string());
        while current != start {
            if let Some(prev) = previous.get(current.as_str()) {
                current = prev;
                path.push(current.to_string());
            } else {
                return Err(GraphError::NoPath {
                    start: start.to_string(),
                    end: end.to_string(),
                });
            }
        }
        path.reverse();

        let cost = *distances.get(end).unwrap_or(&f64::INFINITY);
        Ok(ShortestPathResult { cost, path })
    }

    pub fn page_rank(&self, options: PageRankOptions) -> Result<Vec<PageRankScore>, GraphError> {
        if options.damping <= 0.0 || options.damping >= 1.0 {
            return Err(GraphError::InvalidParameter(
                "damping factor must be between 0 and 1".into(),
            ));
        }
        if options.tolerance <= 0.0 {
            return Err(GraphError::InvalidParameter(
                "tolerance must be positive".into(),
            ));
        }
        if options.max_iterations == 0 {
            return Err(GraphError::InvalidParameter(
                "max_iterations must be positive".into(),
            ));
        }

        let node_count = self.graph.adjacency.len() as f64;
        let mut scores: HashMap<&str, f64> = self
            .graph
            .adjacency
            .keys()
            .map(|node| (node.as_str(), 1.0 / node_count))
            .collect();
        let damping_value = (1.0 - options.damping) / node_count;

        for _ in 0..options.max_iterations {
            let mut delta = 0.0;
            let mut next_scores: HashMap<&str, f64> = HashMap::new();

            for (node, neighbors) in &self.graph.adjacency {
                if neighbors.is_empty() {
                    continue;
                }
                let share = scores[node.as_str()] / neighbors.len() as f64;
                for (neighbor, _) in neighbors {
                    let entry = next_scores.entry(neighbor.as_str()).or_insert(0.0);
                    *entry += share;
                }
            }

            for node in self.graph.adjacency.keys() {
                let next = damping_value
                    + options.damping * next_scores.get(node.as_str()).copied().unwrap_or(0.0);
                delta += (next - scores[node.as_str()]).abs();
                scores.insert(node.as_str(), next);
            }

            if delta < options.tolerance {
                break;
            }
        }

        let mut ranked: Vec<PageRankScore> = scores
            .into_iter()
            .map(|(node, score)| PageRankScore {
                node: node.to_string(),
                score,
            })
            .collect();
        ranked.sort_by(|a, b| {
            b.score
                .total_cmp(&a.score)
                .then_with(|| a.node.cmp(&b.node))
        });
        Ok(ranked)
    }

    pub fn connected_components(&self) -> Vec<ConnectedComponent> {
        let mut visited: HashSet<&str> = HashSet::new();
        let mut components = Vec::new();

        for node in self.graph.nodes() {
            if visited.contains(node.as_str()) {
                continue;
            }
            let mut stack = vec![node.as_str()];
            let mut component_nodes: Vec<String> = Vec::new();

            while let Some(current) = stack.pop() {
                if !visited.insert(current) {
                    continue;
                }
                component_nodes.push(current.to_string());
                if let Some(neighbors) = self.graph.undirected_neighbors(current) {
                    for (neighbor, _) in neighbors {
                        if !visited.contains(neighbor.as_str()) {
                            stack.push(neighbor);
                        }
                    }
                }
            }

            component_nodes.sort();
            components.push(ConnectedComponent {
                nodes: component_nodes,
            });
        }

        components.sort_by(|a, b| a.nodes.len().cmp(&b.nodes.len()));
        components
    }

    pub fn execute(
        &self,
        request: GraphAnalyticsRequest,
    ) -> Result<GraphAnalyticsResponse, GraphError> {
        match request {
            GraphAnalyticsRequest::ShortestPath { start, end } => {
                let result = self.shortest_path(&start, &end)?;
                Ok(GraphAnalyticsResponse::ShortestPath { result })
            }
            GraphAnalyticsRequest::PageRank {
                damping,
                tolerance,
                max_iterations,
            } => {
                let scores = self.page_rank(PageRankOptions {
                    damping,
                    tolerance,
                    max_iterations,
                })?;
                Ok(GraphAnalyticsResponse::PageRank { scores })
            }
            GraphAnalyticsRequest::ConnectedComponents => {
                let components = self.connected_components();
                Ok(GraphAnalyticsResponse::ConnectedComponents { components })
            }
        }
    }
}

#[derive(Debug)]
struct State {
    cost: f64,
    position: String,
}

impl Eq for State {}

impl PartialEq for State {
    fn eq(&self, other: &Self) -> bool {
        self.cost == other.cost && self.position == other.position
    }
}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        // reversed for min-heap behaviour
        other
            .cost
            .partial_cmp(&self.cost)
            .unwrap_or(Ordering::Equal)
            .then_with(|| self.position.cmp(&other.position))
    }
}

impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
