use std::{net::SocketAddr, sync::Arc};

use axum::Router;
use tokio::net::TcpListener;
use tracing_subscriber::{fmt, EnvFilter};
use zk_tx_svc::{build_router, OverlapCircuit, PedersenMiMCCircuit};

#[tokio::main]
async fn main() {
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    fmt()
        .with_env_filter(env_filter)
        .with_target(false)
        .compact()
        .init();

    let circuit: Arc<dyn OverlapCircuit> = Arc::new(PedersenMiMCCircuit::new());
    let app: Router = build_router(circuit);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    let listener = TcpListener::bind(addr)
        .await
        .expect("failed to bind zk-tx-svc listener");
    tracing::info!(target: "zk_tx_startup", %addr, "zk-tx-svc starting");

    axum::serve(listener, app.into_make_service())
        .await
        .expect("server failed");
}
