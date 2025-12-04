use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use crate::failure_detector::phi_accrual::PhiAccrualFailureDetector;

#[derive(Debug, Clone, PartialEq)]
pub enum NodeStatus {
    Alive,
    Suspect,
    Dead,
}

#[derive(Debug, Clone)]
pub struct Node {
    pub id: String,
    pub address: String,
    pub status: NodeStatus,
    pub last_heartbeat: Instant,
}

pub struct ClusterMembership {
    nodes: Arc<Mutex<HashMap<String, Node>>>,
    failure_detector: Arc<Mutex<PhiAccrualFailureDetector>>,
}

impl ClusterMembership {
    pub fn new() -> Self {
        Self {
            nodes: Arc::new(Mutex::new(HashMap::new())),
            failure_detector: Arc::new(Mutex::new(PhiAccrualFailureDetector::new(8.0, 1000))),
        }
    }

    pub fn add_node(&self, id: String, address: String) {
        let mut nodes = self.nodes.lock().unwrap();
        nodes.insert(id.clone(), Node {
            id,
            address,
            status: NodeStatus::Alive,
            last_heartbeat: Instant::now(),
        });
    }

    pub fn heartbeat(&self, node_id: &str) {
        let mut nodes = self.nodes.lock().unwrap();
        if let Some(node) = nodes.get_mut(node_id) {
            node.last_heartbeat = Instant::now();
            node.status = NodeStatus::Alive;

            let mut fd = self.failure_detector.lock().unwrap();
            fd.report(node_id);
        }
    }

    pub fn check_failures(&self) {
        let mut nodes = self.nodes.lock().unwrap();
        let fd = self.failure_detector.lock().unwrap();

        for (id, node) in nodes.iter_mut() {
            if fd.is_available(id) {
                 node.status = NodeStatus::Alive;
            } else {
                 // If phi is high enough, mark as Suspect/Dead
                 node.status = NodeStatus::Suspect;
            }
        }
    }

    pub fn get_node_status(&self, node_id: &str) -> Option<NodeStatus> {
        let nodes = self.nodes.lock().unwrap();
        nodes.get(node_id).map(|n| n.status.clone())
    }
}
