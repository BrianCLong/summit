use chrono::{TimeZone, Utc};
use once_cell::sync::Lazy;
use sja::{AlertType, JoinEvent, SjaConfig, SjaService};
use tokio::time::{sleep, timeout, Duration};

static BASE_EVENT: Lazy<JoinEvent> = Lazy::new(|| JoinEvent {
    timestamp: Utc.timestamp_opt(1_700_000_000, 0).unwrap(),
    join_id: "orders-users".to_string(),
    left_stream: "orders".to_string(),
    right_stream: "users".to_string(),
    left_tenant: "tenant-a".to_string(),
    right_tenant: "tenant-a".to_string(),
    left_count: 100,
    right_count: 100,
    output_count: 100,
    join_keys: (0..100).map(|i| format!("order-{i}")).collect(),
    quasi_ids_left: (0..50).map(|i| format!("zip-{i}")).collect(),
    quasi_ids_right: (50..100).map(|i| format!("zip-{i}")).collect(),
});

fn spike_event(output: u64) -> JoinEvent {
    let mut event = BASE_EVENT.clone();
    event.output_count = output;
    event.timestamp = Utc::now();
    event.join_keys = (0..output).map(|i| format!("order-{i}")).collect();
    event
}

fn overlap_event() -> JoinEvent {
    let mut event = BASE_EVENT.clone();
    event.timestamp = Utc::now();
    event.quasi_ids_left = vec!["zip-10".into(), "zip-11".into(), "zip-12".into()];
    event.quasi_ids_right = vec!["zip-11".into(), "zip-12".into(), "zip-55".into()];
    event
}

fn cross_tenant_event() -> JoinEvent {
    let mut event = BASE_EVENT.clone();
    event.timestamp = Utc::now();
    event.left_tenant = "tenant-a".into();
    event.right_tenant = "tenant-b".into();
    event
}

#[tokio::test]
async fn detects_risky_join_patterns_and_replays() {
    let mut config = SjaConfig::default();
    config.cardinality_spike_ratio = 2.0;
    config.min_baseline_samples = 2;
    let service = SjaService::start(config.clone());

    service.submit(BASE_EVENT.clone()).await;
    sleep(Duration::from_millis(10)).await;
    service.submit(spike_event(120)).await;
    sleep(Duration::from_millis(10)).await;
    while service.try_recv_alert().await.is_some() {}

    service.submit(spike_event(300)).await;
    let spike_alert = timeout(Duration::from_millis(200), service.recv_alert())
        .await
        .expect("spike alert latency")
        .expect("spike alert value");
    assert_eq!(spike_alert.alert.alert_type, AlertType::CardinalitySpike);
    assert!(spike_alert.digest.estimated_cardinality() >= 250.0);
    assert!(spike_alert.digest.might_contain("order-1"));

    service.submit(overlap_event()).await;
    let overlap_alert = timeout(Duration::from_millis(200), service.recv_alert())
        .await
        .expect("overlap alert latency")
        .expect("overlap alert value");
    assert_eq!(overlap_alert.alert.alert_type, AlertType::QuasiIdOverlap);

    service.submit(cross_tenant_event()).await;
    let cross_alert = timeout(Duration::from_millis(200), service.recv_alert())
        .await
        .expect("cross tenant alert latency")
        .expect("cross tenant alert value");
    assert_eq!(cross_alert.alert.alert_type, AlertType::CrossTenantKey);

    let audit_handle = service.audit_log();
    service.shutdown().await;

    let audit_snapshot = audit_handle.lock().await.clone();
    let recorded = audit_snapshot.recorded_alerts();
    let replayed = audit_snapshot.replay(config);
    assert_eq!(recorded, replayed);
}
