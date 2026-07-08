#!/usr/bin/env node
// Wizard session_start hook: when undercover is active for this repo, print a
// short "keep the history clean" reminder to stdout. Wizard appends session_start
// stdout to the session's system context. Fails open (silent).

import { loadConfig, isActive } from '../lib/config.mjs'

const GUIDANCE = `## Undercover mode is active

You are working in a public repository. Keep the git history clean:

- Write commit messages and PR titles/bodies the way a human developer would — describe only what the change does.
- Do NOT add AI-assistant attribution: no "Generated with …", no "Co-Authored-By: <assistant>", no 🤖 footer, and no mention that an AI wrote the change.
- Do NOT leak this project's configured sensitive terms (the "blocklist" in .undercover.json) into commit messages, PR text, comments, or code.

Good examples: "Fix race condition in file watcher init", "Add support for custom key bindings", "Refactor parser for clearer error messages".`

async function readStdin() {
  let raw = ''
  try {
    for await (const chunk of process.stdin) raw += chunk
  } catch {
    /* ignore */
  }
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function main() {
  const input = await readStdin()
  const cwd = input.cwd || process.cwd()
  const cfg = loadConfig(cwd)
  if (!cfg.injectGuidance) process.exit(0)
  if (!isActive(cfg, cwd).active) process.exit(0)
  process.stdout.write(GUIDANCE + '\n')
  process.exit(0)
}

main().catch(() => process.exit(0))
