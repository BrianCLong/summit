use std::net::SocketAddr;

use dp_bank::server;

#[tokio::main]
async fn main() {
    let addr: SocketAddr = std::env::var("DP_BANK_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8080".to_string())
        .parse()
        .expect("invalid DP_BANK_ADDR value");
    println!("Starting Differential Privacy Budget Bank on {addr}");
    if let Err(err) = server::run(addr).await {
        eprintln!("server error: {err}");
    }
}
