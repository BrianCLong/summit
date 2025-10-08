#!/bin/bash
# pr-evidence-bundle/show-key-metrics.sh
# Show examples of key metrics that would be collected

echo "📊 Key Metrics Collected by Fastlane Orchestration"
echo "=================================================="
echo

echo "SLO & Budget Metrics:"
echo "--------------------"
echo "api_p95_latency_ms{threshold=\"350\"} 320"
echo "api_p99_latency_ms{threshold=\"900\"} 850" 
echo "api_errors{budget=\"2\"} 1"
echo "api_calls_total 1000000"
echo "write_p95_latency_ms{threshold=\"700\"} 650"
echo "ingest_packets_per_second{threshold=\"1000\"} 950"
echo "api_error_rate{budget=\"2\"} 0.000001"
echo "ingest_error_rate{budget=\"0.1\"} 0"
echo

echo "Pipeline Performance Metrics:"
echo "----------------------------"
echo "handoff.duration_ms{route=\"fastlane\",workflow=\"ci-green-baseline\"} 1250"
echo "pipeline.tail_latency_ms{pre_fastlane=\"10s\",post_fastlane=\"2.5s\"} -7500"
echo "friction.alert.count{type=\"BUILD_SLOW\",owner=\"DevEx\",severity=\"warning\"} 2"
echo "ci.queue.depth{workflow=\"ci-green-baseline\"} 3"
echo "ci.build.time_ms{route=\"fastlane\"} 2500"
echo "cache.hit_ratio{route=\"fastlane\"} 0.92"
echo

echo "Canary Deployment Metrics:"
echo "--------------------------"
echo "canary.rollout.duration_ms 600000"
echo "canary.traffic_percentage{version=\"v2025.11.2\"} 15"
echo "canary.slo.violations{type=\"latency\"} 0"
echo "canary.decision.score{result=\"promote\"} 85"
echo "rollback.triggered{reason=\"manual\"} 0"
echo

echo "Resource Utilization:"
echo "--------------------"
echo "cpu.utilization.percent{service=\"orchestrator\"} 45"
echo "memory.usage.bytes{service=\"orchestrator\"} 128450560"
echo "disk.io.read_bytes_per_second 2457600"
echo "network.bytes_transmitted_per_second 8192000"
echo

echo "Observability & Tracing:"
echo "------------------------"
echo "trace.exemplar.latency_ms{trace_id=\"abc123\",span_id=\"def456\"} 150"
echo "log.entry.count{level=\"info\",service=\"orchestrator\"} 1247"
echo "alert.firing.count{severity=\"warning\"} 2"
echo "dashboard.panel.render_time_ms{panel=\"handoff-speed\"} 45"