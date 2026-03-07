export async function getRepoSnapshot(repo: string, commit: string): Promise<string> {
  return `snapshot_${repo.replace('/', '_')}_${commit}`;
}
