import { setTimeout as delay } from 'timers/promises';

interface Issue {
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  pull_request?: unknown;
}

interface Options {
  repo: string;
  state: 'open' | 'all' | 'closed';
  token?: string;
  since?: string;
}

const REVIEW_PATTERN = /^Review\s+(.+\.md)$/i;

const parseArgs = (): Options => {
  const args = process.argv.slice(2);
  const options: Options = {
    repo: process.env.GITHUB_REPOSITORY ?? '',
    state: 'open',
    token: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if ((arg === '--repo' || arg === '-r') && args[i + 1]) {
      options.repo = args[i + 1];
      i += 1;
    } else if (arg === '--state' && args[i + 1]) {
      const state = args[i + 1];
      if (state === 'open' || state === 'all' || state === 'closed') {
        options.state = state;
      }
      i += 1;
    } else if (arg === '--since' && args[i + 1]) {
      options.since = args[i + 1];
      i += 1;
    }
  }

  if (!options.repo) {
    console.error('Repository is required. Provide via --repo or GITHUB_REPOSITORY.');
    process.exit(1);
  }

  return options;
};

const toSlug = (filename: string) =>
  filename
    .replace(/\.md$/i, '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const buildComment = (docName: string, tasksPath: string) => `Thanks for surfacing this document review request. We now maintain an automated doc -> tasks pipeline, so manual "Review ${docName}" issues are superseded.

- Extracted tasks: ${tasksPath}
- Extraction command: \`make docs-tasks\`
- Closure reason: superseded by automated doc-task pipeline and tracked task index

If new tasks appear in ${docName}, please re-run the extractor and update ${tasksPath} before re-opening.`;

const extractDocName = (title: string): string | null => {
  const match = title.match(REVIEW_PATTERN);
  return match ? match[1].trim() : null;
};

const parseLinkHeader = (linkHeader: string | null) => {
  if (!linkHeader) return undefined;
  const links = linkHeader.split(',').map((part) => part.trim());
  const linkMap: Record<string, string> = {};

  links.forEach((link) => {
    const match = link.match(/<([^>]+)>; rel="([^"]+)"/);
    if (match) {
      linkMap[match[2]] = match[1];
    }
  });

  return linkMap.next;
};

const handleRateLimit = async (response: Response) => {
  const remaining = response.headers.get('x-ratelimit-remaining');
  if (remaining !== '0') return;

  const reset = response.headers.get('x-ratelimit-reset');
  const resetMs = reset ? Number(reset) * 1000 : Date.now() + 60_000;
  const waitMs = Math.max(resetMs - Date.now(), 1_000);
  console.warn(`Rate limit hit. Waiting ${Math.ceil(waitMs / 1000)}s before retrying...`);
  await delay(waitMs);
};

const fetchIssues = async (options: Options): Promise<Issue[]> => {
  const issues: Issue[] = [];
  let pageUrl = `https://api.github.com/repos/${options.repo}/issues?state=${options.state}&per_page=100`;
  if (options.since) {
    pageUrl += `&since=${encodeURIComponent(options.since)}`;
  }

  while (pageUrl) {
    const response = await fetch(pageUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
    });

    if (response.status === 403) {
      await handleRateLimit(response);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
    }

    const pageIssues = (await response.json()) as Issue[];
    const filtered = pageIssues.filter((issue) => !issue.pull_request && REVIEW_PATTERN.test(issue.title));
    issues.push(...filtered);

    pageUrl = parseLinkHeader(response.headers.get('link')) ?? '';
  }

  return issues;
};

const formatOutput = (issue: Issue, comment: string) => {
  const divider = '-'.repeat(72);
  return `${divider}\nIssue #${issue.number}: ${issue.title}\nURL: ${issue.html_url}\n${divider}\n${comment}\n`;
};

const main = async () => {
  const options = parseArgs();
  const issues = await fetchIssues(options);

  if (!issues.length) {
    console.log('No matching "Review *.md" issues found for the provided filters.');
    return;
  }

  issues.forEach((issue) => {
    const docName = extractDocName(issue.title);
    if (!docName) return;
    const slug = toSlug(docName);
    const tasksPath = `docs/tasks/${slug}.tasks.md`;
    const comment = buildComment(docName, tasksPath);
    const output = formatOutput(issue, comment);
    console.log(output);
  });
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
