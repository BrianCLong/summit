use anyhow::Result;

pub struct SchemaRegistry {
    pub client: reqwest::Client,
    pub base_url: String,
}

pub trait SchemaEvolution {
    fn can_migrate(&self, from_version: i32, to_version: i32) -> bool;
    fn migrate(&self, data: &[u8], target_version: i32) -> Result<Vec<u8>>;
}

impl SchemaRegistry {
    pub fn new(base_url: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url,
        }
    }
}
