export function analyzeContent(bundle: any) {
  let sensationalCount = 0;
  let totalItems = 0;

  for (const item of bundle.items || []) {
    if (item.type === 'article' && item.text) {
      totalItems++;
      if (item.text.includes('SHOCKING') || item.text.includes('100% real')) {
        sensationalCount++;
      }
    }
  }

  return {
    sensationalism_score: totalItems > 0 ? sensationalCount / totalItems : 0,
    unknown_source_rate: 0
  };
}
