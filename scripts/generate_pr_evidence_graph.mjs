import fs from "fs"
import path from "path"

const dir = ".artifacts/pr-archive"

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))

let edges = []

for (const file of files) {
  const data = JSON.parse(
    fs.readFileSync(path.join(dir, file))
  )

  const pr = `pr_${data.pr_number}`
  const user = `user_${data.author}`
  const artifact = `artifact_pr_${data.pr_number}`

  edges.push(`"${pr}" -> "${user}" [label="contributed_by"]`)
  edges.push(`"${pr}" -> "${artifact}" [label="archived_as"]`)

  for (const f of data.files_changed || []) {
    const module = `module_${f.replace(/[\/.]/g,"_")}`
    edges.push(`"${pr}" -> "${module}" [label="touches_module"]`)
  }
}

const graph = `
digraph SummitEvidence {
${edges.join("\n")}
}
`

fs.writeFileSync(
  ".artifacts/evidence-graph.dot",
  graph
)
