export function analyzeNetwork(bundle: any) {
  const posts = (bundle.items || []).filter((i: any) => i.type === 'social_post');

  let coordinatedCount = 0;
  const timeWindowMs = 60000; // 1 min

  // Simple O(N^2) comparison for MWS
  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const p1 = posts[i];
      const p2 = posts[j];
      const t1 = new Date(p1.timestamp).getTime();
      const t2 = new Date(p2.timestamp).getTime();

      if (Math.abs(t1 - t2) < timeWindowMs) {
        const urls1 = p1.shared_urls || [];
        const urls2 = p2.shared_urls || [];
        const common = urls1.filter((u: string) => urls2.includes(u));
        if (common.length > 0) {
          coordinatedCount++;
        }
      }
    }
  }

  const domains = new Set<string>();
  for (const item of bundle.items || []) {
      if (item.source_meta?.domain) domains.add(item.source_meta.domain);
      if (item.url) {
          try {
              domains.add(new URL(item.url).hostname);
          } catch {}
      }
      if (item.shared_urls) {
        for (const u of item.shared_urls) {
           try { domains.add(new URL(u).hostname); } catch {}
        }
      }
  }

  return {
    coordinated_sharing_events: coordinatedCount,
    unique_domains: domains.size,
    exposure_graph_nodes: posts.length
  };
}
