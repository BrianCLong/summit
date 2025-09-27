use std::fmt;

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind {
    Source,
    Transform,
    Sink,
}

impl fmt::Display for NodeKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            NodeKind::Source => write!(f, "source"),
            NodeKind::Transform => write!(f, "transform"),
            NodeKind::Sink => write!(f, "sink"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "unit", rename_all = "snake_case")]
pub enum Retention {
    Days { value: u32 },
    Hours { value: u32 },
    Indefinite,
}

impl Retention {
    pub fn to_days(&self) -> u32 {
        match self {
            Retention::Days { value } => *value,
            Retention::Hours { value } => (*value + 23) / 24,
            Retention::Indefinite => u32::MAX,
        }
    }

    pub fn as_str(&self) -> String {
        match self {
            Retention::Days { value } => format!("{}d", value),
            Retention::Hours { value } => format!("{}h", value),
            Retention::Indefinite => "indefinite".to_string(),
        }
    }
}

impl fmt::Display for Retention {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Annotations {
    pub purpose: String,
    pub jurisdiction: String,
    pub retention: Retention,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Node {
    pub name: String,
    pub kind: NodeKind,
    pub annotations: Annotations,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Edge {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Flow {
    pub name: Option<String>,
    pub nodes: IndexMap<String, Node>,
    pub edges: Vec<Edge>,
}

#[derive(Debug, Error)]
pub enum DslError {
    #[error("invalid statement on line {line}: {content}")]
    InvalidStatement { line: usize, content: String },
    #[error("node '{0}' declared more than once")]
    DuplicateNode(String),
    #[error("node '{0}' referenced before definition")]
    UnknownNode(String),
    #[error("annotations missing required field '{field}' on line {line}")]
    MissingAnnotation { field: String, line: usize },
    #[error("annotations block missing for {kind} '{name}' on line {line}")]
    MissingAnnotations {
        kind: String,
        name: String,
        line: usize,
    },
}

pub fn parse(input: &str) -> Result<Flow, DslError> {
    let mut nodes: IndexMap<String, Node> = IndexMap::new();
    let mut edges: Vec<Edge> = Vec::new();
    let mut flow_name: Option<String> = None;

    for (idx, raw_line) in input.lines().enumerate() {
        let line_no = idx + 1;
        let line = raw_line.split('#').next().unwrap_or("").trim();
        if line.is_empty() {
            continue;
        }

        if let Some(name) = line.strip_prefix("flow ") {
            flow_name = Some(name.trim().to_string());
            continue;
        }

        if let Some(kind) = parse_kind_prefix(line) {
            let node = parse_node_line(kind, line, line_no)?;
            if nodes.contains_key(&node.name) {
                return Err(DslError::DuplicateNode(node.name));
            }
            nodes.insert(node.name.clone(), node);
            continue;
        }

        if line.contains("->") {
            let edge_defs = parse_edge_line(line);
            for edge in edge_defs {
                if !nodes.contains_key(&edge.from) {
                    return Err(DslError::UnknownNode(edge.from));
                }
                if !nodes.contains_key(&edge.to) {
                    return Err(DslError::UnknownNode(edge.to));
                }
                edges.push(edge);
            }
            continue;
        }

        return Err(DslError::InvalidStatement {
            line: line_no,
            content: line.to_string(),
        });
    }

    Ok(Flow {
        name: flow_name,
        nodes,
        edges,
    })
}

fn parse_kind_prefix(line: &str) -> Option<NodeKind> {
    if line.starts_with("source ") {
        Some(NodeKind::Source)
    } else if line.starts_with("transform ") {
        Some(NodeKind::Transform)
    } else if line.starts_with("sink ") {
        Some(NodeKind::Sink)
    } else {
        None
    }
}

fn parse_node_line(kind: NodeKind, line: &str, line_no: usize) -> Result<Node, DslError> {
    let rest = line[kind.to_string().len()..].trim();
    let mut parts = rest.splitn(2, ' ');
    let name = parts.next().unwrap_or("").trim();
    if name.is_empty() {
        return Err(DslError::InvalidStatement {
            line: line_no,
            content: line.to_string(),
        });
    }
    let remainder = parts.next().unwrap_or("").trim();
    let annotation_block = if let Some(start) = remainder.find('[') {
        let end = remainder
            .rfind(']')
            .ok_or_else(|| DslError::MissingAnnotations {
                kind: kind.to_string(),
                name: name.to_string(),
                line: line_no,
            })?;
        &remainder[start + 1..end]
    } else {
        return Err(DslError::MissingAnnotations {
            kind: kind.to_string(),
            name: name.to_string(),
            line: line_no,
        });
    };
    let annotations = parse_annotations(annotation_block, line_no)?;

    Ok(Node {
        name: name.to_string(),
        kind,
        annotations,
    })
}

fn parse_annotations(block: &str, line_no: usize) -> Result<Annotations, DslError> {
    let mut purpose: Option<String> = None;
    let mut jurisdiction: Option<String> = None;
    let mut retention: Option<Retention> = None;

    for pair in block.split(',') {
        let trimmed = pair.trim();
        if trimmed.is_empty() {
            continue;
        }
        let mut kv = trimmed.splitn(2, '=');
        let key = kv.next().unwrap().trim();
        let value = kv.next().unwrap_or("").trim();
        match key {
            "purpose" => purpose = Some(value.to_string()),
            "jurisdiction" => jurisdiction = Some(value.to_string()),
            "retention" => retention = Some(parse_retention(value)),
            _ => {}
        }
    }

    Ok(Annotations {
        purpose: purpose.ok_or_else(|| DslError::MissingAnnotation {
            field: "purpose".to_string(),
            line: line_no,
        })?,
        jurisdiction: jurisdiction.ok_or_else(|| DslError::MissingAnnotation {
            field: "jurisdiction".to_string(),
            line: line_no,
        })?,
        retention: retention.ok_or_else(|| DslError::MissingAnnotation {
            field: "retention".to_string(),
            line: line_no,
        })?,
    })
}

fn parse_retention(value: &str) -> Retention {
    let value = value.trim().to_lowercase();
    if value == "indefinite" || value == "forever" {
        return Retention::Indefinite;
    }
    if let Some(days) = value.strip_suffix('d') {
        if let Ok(parsed) = days.parse::<u32>() {
            return Retention::Days { value: parsed };
        }
    }
    if let Some(hours) = value.strip_suffix('h') {
        if let Ok(parsed) = hours.parse::<u32>() {
            return Retention::Hours { value: parsed };
        }
    }
    if let Ok(parsed) = value.parse::<u32>() {
        return Retention::Days { value: parsed };
    }
    Retention::Indefinite
}

fn parse_edge_line(line: &str) -> Vec<Edge> {
    let parts: Vec<&str> = line
        .split("->")
        .map(|p| p.trim())
        .filter(|p| !p.is_empty())
        .collect();
    let mut edges = Vec::new();
    for window in parts.windows(2) {
        if let [from, to] = window {
            edges.push(Edge {
                from: (*from).to_string(),
                to: (*to).to_string(),
            });
        }
    }
    edges
}
