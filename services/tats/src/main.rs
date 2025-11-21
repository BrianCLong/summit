use tats::config::ServiceConfig;
use tats::server;
use tracing::error;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .init();

    let config = match ServiceConfig::from_env() {
        Ok(cfg) => cfg,
        Err(err) => {
            error!(?err, "failed to load configuration");
            std::process::exit(1);
        }
    };

    if let Err(err) = server::serve(config).await {
        error!(?err, "server terminated with error");
        std::process::exit(1);
    }
}
