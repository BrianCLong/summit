import fs from 'node:fs';

export interface PRMetrics {
  review_friction_index: number;
  comments_count: number;
}

export function collectPRMetrics(): PRMetrics {
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const event = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
      // Example logic: calculate friction based on requested_changes or comment count
      // This is a simplified proxy.
      // In a real implementation, we would need to fetch reviews from API as event payload might be partial.

      const comments = event.pull_request?.comments || 0;
      const review_comments = event.pull_request?.review_comments || 0;

      return {
        review_friction_index: comments + review_comments,
        comments_count: comments + review_comments
      };
    } catch (e) {
      console.warn('Failed to parse GITHUB_EVENT_PATH', e);
    }
  }

  return { review_friction_index: 0, comments_count: 0 };
}
