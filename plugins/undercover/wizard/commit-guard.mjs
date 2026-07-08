#!/usr/bin/env node
// Wizard pre_tool_use(execute) hook: block `git commit` / `gh pr create|edit`
// commands whose text carries AI-assistant attribution or blocklisted terms while
// undercover is active. Reuses the shared config/scan logic; fails open.
//
// Wizard hook semantics (see wizard/docs/hooks.md):
//   - exit 2 + stderr  → block the tool call; stderr is the reason the model sees.
//   - exit 0           → allow. (warn mode surfaces the notice on stderr, best-effort.)
// The payload on stdin is { event, tool_name, args: { command }, cwd, ... }.

import { loadConfig, isActive, scan } from '../lib/config.mjs'

const COMMIT_RE = /\bgit\s+commit\b/
const PR_RE = /\bgh\s+pr\s+(create|edit)\b/

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
  const command = input?.args?.command || ''

  const isPr = PR_RE.test(command)
  if (!COMMIT_RE.test(command) && !isPr) process.exit(0)

  const cfg = loadConfig(cwd)
  if (!cfg.guardCommands) process.exit(0)
  if (!isActive(cfg, cwd).active) process.exit(0)

  const hits = scan(command, cfg)
  if (hits.length === 0) process.exit(0)

  const found = hits.map((h) => `  • ${h.label}: "${h.match}"`).join('\n')
  const msg =
    `Undercover blocked this ${isPr ? 'PR' : 'commit'} — the message contains content that must not appear in a public repo:\n` +
    `${found}\n\n` +
    `Rewrite it the way a human developer would: describe only what the change does. ` +
    `Remove any AI-assistant attribution (no "Generated with …", no "Co-Authored-By: <assistant>", no 🤖 footer) ` +
    `and any blocklisted terms, then run the command again.`

  // warn mode: allow, but surface the notice (best-effort — Wizard only guarantees
  // stderr is shown on a block). block mode: exit 2 so the call never runs.
  process.stderr.write(msg + '\n')
  process.exit(cfg.guardAction === 'warn' ? 0 : 2)
}

main().catch(() => process.exit(0))
