use std::path::{Path, PathBuf};
use std::sync::Arc;
use arc_swap::ArcSwap;
use notify::{Watcher, RecommendedWatcher, RecursiveMode, Event};
use serde::Deserialize;
use anyhow::{Result, Context};

#[derive(Clone, Debug, Deserialize, Default)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
}

#[derive(Clone, Debug, Deserialize, Default)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Clone, Debug, Deserialize, Default)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
}

pub struct ConfigManager {
    current_config: Arc<ArcSwap<AppConfig>>,
    config_path: PathBuf,
    _watcher: Option<RecommendedWatcher>, // Keep watcher alive
}

impl ConfigManager {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref().to_path_buf();
        let config = Self::load_config(&path)?;
        let current_config = Arc::new(ArcSwap::from(Arc::new(config)));

        Ok(Self {
            current_config,
            config_path: path,
            _watcher: None,
        })
    }

    fn load_config(path: &Path) -> Result<AppConfig> {
        let settings = config::Config::builder()
            .add_source(config::File::from(path))
            .build()
            .map_err(|e| anyhow::anyhow!(e))
            .context("Failed to build config")?;

        settings.try_deserialize()
            .map_err(|e| anyhow::anyhow!(e))
            .context("Failed to deserialize config")
    }

    pub fn get(&self) -> Arc<AppConfig> {
        self.current_config.load().clone()
    }

    pub async fn start_watcher(&mut self) -> Result<()> {
        let current_config = self.current_config.clone();
        let config_path = self.config_path.clone();

        // We watch the parent directory to detect file updates even if they are atomic renames (new inode)
        let parent = config_path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf();
        let filename = config_path.file_name().ok_or_else(|| anyhow::anyhow!("Invalid config path"))?.to_os_string();

        let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
             match res {
                Ok(event) => {
                    // Check if the event affects our config file
                    // Event paths are absolute or relative depending on watch.
                    // We just check if any of the paths end with our filename.
                    let matches = event.paths.iter().any(|p| {
                        p.file_name() == Some(filename.as_os_str())
                    });

                    if matches && (event.kind.is_modify() || event.kind.is_create() || event.kind.is_remove()) {
                        // Reload
                         match Self::load_config(&config_path) {
                            Ok(new_config) => {
                                current_config.store(Arc::new(new_config));
                            },
                            Err(e) => eprintln!("Failed to reload config: {:?}", e),
                        }
                    }
                },
                Err(e) => eprintln!("Watch error: {:?}", e),
            }
        })?;

        watcher.watch(&parent, RecursiveMode::NonRecursive)?;
        self._watcher = Some(watcher);

        Ok(())
    }
}
