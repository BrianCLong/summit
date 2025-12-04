use ibrs::ConfigManager;
use std::fs::File;
use std::io::Write;
use tempfile::Builder;
use std::time::Duration;
use tokio::time::sleep;

#[tokio::test]
async fn test_config_loading_and_reloading() {
    // 1. Create a temporary config file with .toml extension
    let mut tmp_file = Builder::new()
        .suffix(".toml")
        .tempfile()
        .unwrap();
    let config_content = r#"
        [server]
        host = "127.0.0.1"
        port = 8080

        [database]
        url = "postgres://localhost:5432/db"
        max_connections = 5
    "#;
    write!(tmp_file, "{}", config_content).unwrap();
    let path = tmp_file.path().to_path_buf();

    // 2. Initialize ConfigManager
    let mut manager = ConfigManager::new(&path).expect("Failed to create config manager");

    // Verify initial config
    let config = manager.get();
    assert_eq!(config.server.host, "127.0.0.1");
    assert_eq!(config.server.port, 8080);

    // 3. Start watcher
    manager.start_watcher().await.expect("Failed to start watcher");

    // 4. Modify config file
    let new_config_content = r#"
        [server]
        host = "0.0.0.0"
        port = 9090

        [database]
        url = "postgres://localhost:5432/db"
        max_connections = 10
    "#;

    // Write new content directly to path to trigger modify event on existing inode or new inode
    {
        let mut file = File::create(&path).unwrap();
        write!(file, "{}", new_config_content).unwrap();
        file.sync_all().unwrap();
    }

    // 5. Wait for watcher to trigger
    for _ in 0..20 {
        sleep(Duration::from_millis(100)).await;
        let new_config = manager.get();
        if new_config.server.port == 9090 {
            break;
        }
    }

    // 6. Verify config update
    let new_config = manager.get();
    assert_eq!(new_config.server.host, "0.0.0.0");
    assert_eq!(new_config.server.port, 9090);

    // Keep tmp_file alive until end of test
    drop(tmp_file);
}
