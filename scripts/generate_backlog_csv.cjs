const fs = require("fs");

try {
  const fileContents = fs.readFileSync("backlog.yaml", "utf8");

  const headers = [
    "ID",
    "Epic",
    "Story",
    "Priority",
    "MosCow",
    "Owner",
    "Estimate",
    "Deps",
    "Risk",
    "Status",
  ];
  const rows = [headers.join(",")];

  let idCounter = 1;
  let currentEpic = "";

  const lines = fileContents.split("\n");

  let currentStory = {};

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- epic:")) {
      currentEpic = trimmed.replace("- epic:", "").trim();
    } else if (trimmed.startsWith("- story:")) {
      if (currentStory.story) {
        addStory(currentStory, currentEpic, rows, idCounter++);
        currentStory = {};
      }
      currentStory.story = trimmed.replace("- story:", "").trim();
    } else if (trimmed.startsWith("priority:")) {
      currentStory.priority = trimmed.replace("priority:", "").trim();
    } else if (trimmed.startsWith("sprint:")) {
      currentStory.sprint = trimmed.replace("sprint:", "").trim();
    }
  });
  // Add last story
  if (currentStory.story) {
    addStory(currentStory, currentEpic, rows, idCounter++);
  }

  fs.writeFileSync("ops/ga-rc1/backlog.csv", rows.join("\n"));
  console.log("backlog.csv generated");
} catch (e) {
  console.error(e);
}

function addStory(story, epic, rows, id) {
  const priority = story.priority || "P2";
  let moscow = "WONT";
  let risk = "Low";
  let status = "Backlog";
  let owner = "TBD";

  if (priority.includes("P0")) {
    moscow = "MUST";
    risk = "High";
    status = "GA-Blocker";
    owner = "EngLead";
  } else if (priority.includes("P1")) {
    moscow = "SHOULD";
    risk = "Medium";
    status = "GA-Critical";
    owner = "SeniorDev";
  } else {
    moscow = "COULD";
    status = "Post-GA";
  }

  const row = [
    `IG-${id}`,
    `"${epic}"`,
    `"${story.story}"`,
    `"${priority}"`,
    moscow,
    owner,
    "3d", // estimate
    "None", // deps
    risk,
    status,
  ];
  rows.push(row.join(","));
}
