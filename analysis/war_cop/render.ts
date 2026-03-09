export interface BriefArtifactSet {
  report_json_path: "artifacts/war-cop/report.json";
  metrics_json_path: "artifacts/war-cop/metrics.json";
  stamp_json_path: "artifacts/war-cop/stamp.json";
  brief_md_path: "artifacts/war-cop/brief.md";
}

export function generateArtifactSet(): BriefArtifactSet {
  return {
    report_json_path: "artifacts/war-cop/report.json",
    metrics_json_path: "artifacts/war-cop/metrics.json",
    stamp_json_path: "artifacts/war-cop/stamp.json",
    brief_md_path: "artifacts/war-cop/brief.md",
  };
}
