export function recommendVM(workloadType) {
  if (process.env.SUMMIT_AZURE_TURIN_V7_RECOMMENDER !== '1') {
      return { status: 'disabled', reason: 'Feature flag SUMMIT_AZURE_TURIN_V7_RECOMMENDER not enabled' };
  }

  switch(workloadType) {
      case 'web': return 'Dasv7';
      case 'cache': return 'Eadsv7';
      case 'compute': return 'Fadsv7';
      default: return null;
  }
}
