use std::collections::HashMap;
use std::sync::Arc;

pub trait GeoDatabase: Send + Sync {
    fn resolve_location(&self, ip: &str) -> String;
}

pub struct GeoAwareRouter {
    pub geo_database: Arc<dyn GeoDatabase>,
    pub latency_map: HashMap<String, u32>, // endpoint -> latency ms
}
