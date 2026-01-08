#!/usr/bin/env ts-node
/**
 * Release Chat Notification
 *
 * Posts release notifications to Slack and Teams channels with:
 * - Release version and type
 * - Key highlights
 * - Links to Grafana, Jaeger, and release notes
 */

import * as fs from "fs";
import * as https from "https";
import * as http from "http";

interface Args {
  version: string;
  releaseUrl?: string;
  notesFile?: string;
  stage: string;
  message?: string;
}

interface SlackMessage {
  blocks: SlackBlock[];
  text: string;
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: string;
    url?: string;
    action_id?: string;
  }>;
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

interface TeamsMessage {
  "@type": string;
  "@context": string;
  themeColor: string;
  summary: string;
  sections: TeamsSection[];
  potentialAction?: TeamsAction[];
}

interface TeamsSection {
  activityTitle?: string;
  activitySubtitle?: string;
  facts?: Array<{ name: string; value: string }>;
  text?: string;
  markdown?: boolean;
}

interface TeamsAction {
  "@type": string;
  name: string;
  targets: Array<{ os: string; uri: string }>;
}

function parseArgs(): Args {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].replace("--", "");
      args[key] = argv[i + 1] || "";
      i++;
    }
  }

  return {
    version: args["version"] || "0.0.0",
    releaseUrl: args["release-url"],
    notesFile: args["notes-file"],
    stage: args["stage"] || "unknown",
    message: args["message"],
  };
}

function getStageEmoji(stage: string): string {
  switch (stage) {
    case "train-complete":
      return ":train2:";
    case "promote-10":
      return ":one::zero:";
    case "promote-50":
      return ":five::zero:";
    case "promote-100":
      return ":100:";
    case "promote-complete":
      return ":white_check_mark:";
    case "rollback":
      return ":rewind:";
    case "hotfix-complete":
      return ":fire_engine:";
    default:
      return ":package:";
  }
}

function getStageTitle(stage: string): string {
  switch (stage) {
    case "train-complete":
      return "Release Train Complete";
    case "promote-10":
      return "Canary 10% Deployed";
    case "promote-50":
      return "Canary 50% Deployed";
    case "promote-100":
      return "Production 100% Deployed";
    case "promote-complete":
      return "Release Promoted to Production";
    case "rollback":
      return "Release Rolled Back";
    case "hotfix-complete":
      return "Hotfix Deployed";
    default:
      return "Release Update";
  }
}

function getStageColor(stage: string): string {
  switch (stage) {
    case "promote-complete":
    case "hotfix-complete":
      return "#36a64f"; // Green
    case "rollback":
      return "#ff0000"; // Red
    case "promote-10":
    case "promote-50":
      return "#ffcc00"; // Yellow
    default:
      return "#0078d7"; // Blue
  }
}

function extractHighlights(notesFile?: string): string[] {
  if (!notesFile || !fs.existsSync(notesFile)) {
    return [];
  }

  const content = fs.readFileSync(notesFile, "utf-8");
  const highlights: string[] = [];

  // Extract highlights section
  const highlightsMatch = content.match(/## Highlights\n\n([\s\S]*?)(?=\n##|$)/);
  if (highlightsMatch) {
    const lines = highlightsMatch[1].split("\n").filter((l) => l.startsWith("- "));
    for (const line of lines.slice(0, 3)) {
      highlights.push(line.replace("- ", ""));
    }
  }

  return highlights;
}

function buildSlackMessage(args: Args): SlackMessage {
  const emoji = getStageEmoji(args.stage);
  const title = getStageTitle(args.stage);
  const highlights = extractHighlights(args.notesFile);

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${title}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Version:*\nv${args.version}`,
        },
        {
          type: "mrkdwn",
          text: `*Stage:*\n${args.stage}`,
        },
      ],
    },
  ];

  if (args.message) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: args.message,
      },
    });
  }

  if (highlights.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Highlights:*\n${highlights.map((h) => `• ${h}`).join("\n")}`,
      },
    });
  }

  const grafanaUrl = process.env.GRAFANA_URL || "https://grafana.intelgraph.io";
  const jaegerUrl = process.env.JAEGER_URL || "https://jaeger.intelgraph.io";

  blocks.push({
    type: "actions",
    elements: [
      ...(args.releaseUrl
        ? [
            {
              type: "button",
              text: ":memo: Release Notes",
              url: args.releaseUrl,
              action_id: "view_release",
            },
          ]
        : []),
      {
        type: "button",
        text: ":chart_with_upwards_trend: Grafana",
        url: `${grafanaUrl}/d/release?var-version=${args.version}`,
        action_id: "view_grafana",
      },
      {
        type: "button",
        text: ":mag: Jaeger",
        url: `${jaegerUrl}/search?service=api&tags={"release":"${args.version}"}`,
        action_id: "view_jaeger",
      },
    ],
  });

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Triggered by <https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}|GitHub Actions>`,
      },
    ],
  } as SlackBlock);

  return {
    blocks,
    text: `${title} - v${args.version}`,
  };
}

function buildTeamsMessage(args: Args): TeamsMessage {
  const title = getStageTitle(args.stage);
  const color = getStageColor(args.stage).replace("#", "");
  const highlights = extractHighlights(args.notesFile);

  const sections: TeamsSection[] = [
    {
      activityTitle: title,
      activitySubtitle: `Version: v${args.version}`,
      facts: [
        { name: "Stage", value: args.stage },
        { name: "Run ID", value: process.env.GITHUB_RUN_ID || "N/A" },
      ],
      markdown: true,
    },
  ];

  if (args.message) {
    sections.push({
      text: args.message,
      markdown: true,
    });
  }

  if (highlights.length > 0) {
    sections.push({
      text: `**Highlights:**\n${highlights.map((h) => `- ${h}`).join("\n")}`,
      markdown: true,
    });
  }

  const grafanaUrl = process.env.GRAFANA_URL || "https://grafana.intelgraph.io";

  const actions: TeamsAction[] = [];

  if (args.releaseUrl) {
    actions.push({
      "@type": "OpenUri",
      name: "View Release",
      targets: [{ os: "default", uri: args.releaseUrl }],
    });
  }

  actions.push({
    "@type": "OpenUri",
    name: "View Grafana",
    targets: [
      {
        os: "default",
        uri: `${grafanaUrl}/d/release?var-version=${args.version}`,
      },
    ],
  });

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: color,
    summary: `${title} - v${args.version}`,
    sections,
    potentialAction: actions,
  };
}

async function postWebhook(url: string, payload: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const protocol = parsedUrl.protocol === "https:" ? https : http;

    const req = protocol.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const args = parseArgs();

  console.log(`Sending notification for v${args.version} (${args.stage})...`);

  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  const teamsWebhook = process.env.TEAMS_WEBHOOK_URL;

  const promises: Promise<void>[] = [];

  if (slackWebhook) {
    console.log("Posting to Slack...");
    const slackMessage = buildSlackMessage(args);
    promises.push(
      postWebhook(slackWebhook, slackMessage)
        .then(() => console.log("Slack notification sent"))
        .catch((err) => console.error("Slack notification failed:", err.message))
    );
  } else {
    console.log("SLACK_WEBHOOK_URL not set, skipping Slack");
  }

  if (teamsWebhook) {
    console.log("Posting to Teams...");
    const teamsMessage = buildTeamsMessage(args);
    promises.push(
      postWebhook(teamsWebhook, teamsMessage)
        .then(() => console.log("Teams notification sent"))
        .catch((err) => console.error("Teams notification failed:", err.message))
    );
  } else {
    console.log("TEAMS_WEBHOOK_URL not set, skipping Teams");
  }

  await Promise.all(promises);

  console.log("Notifications complete");
}

main().catch((error) => {
  console.error("Error sending notifications:", error);
  process.exit(1);
});
