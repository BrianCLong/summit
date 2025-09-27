#!/usr/bin/env ts-node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { RolloutManifest } from './manifest'
import { buildDashboardView, formatPlanSummary } from './view-model'

function main() {
  const manifestPath = process.argv[2]
  if (!manifestPath) {
    console.error('Usage: ts-node src/index.ts <manifest.json>')
    process.exit(1)
  }
  const absolute = resolve(manifestPath)
  const raw = readFileSync(absolute, 'utf8')
  const manifest = JSON.parse(raw) as RolloutManifest
  const view = buildDashboardView(manifest)
  console.log(formatPlanSummary(view))
}

main()
