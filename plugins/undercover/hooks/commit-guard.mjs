#!/usr/bin/env node
// PreToolUse(Bash) hook: block `git commit` / `gh pr create|edit` commands whose
// text contains AI-assistant attribution or blocklisted terms while undercover
// is active. Fails open — any error allows the command through.

import { loadConfig, isActive, scan } from '../lib/config.mjs'

const COMMIT_RE = /\bgit\s+commit\b/
const PR_RE = /\bgh\s+pr\s+(create|edit)\b/

function allow() {
  process.stdout.write('{}')
}

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
  const command = input?.tool_input?.command || ''

  const isPr = PR_RE.test(command)
  if (!COMMIT_RE.test(command) && !isPr) return allow()

  const cfg = loadConfig(cwd)
  if (!cfg.guardCommands) return allow()
  if (!isActive(cfg, cwd).active) return allow()

  const hits = scan(command, cfg)
  if (hits.length === 0) return allow()

  const found = hits.map(h => `  • ${h.label}: "${h.match}"`).join('\n')
  const msg =
    `Undercover mode blocked this ${isPr ? 'PR' : 'commit'} — the message contains content that must not appear in a public repo:\n` +
    `${found}\n\n` +
    `Rewrite it the way a human developer would: describe only what the change does. ` +
    `Remove any AI-assistant attribution (no "Generated with …", no "Co-Authored-By: <assistant>", no 🤖 footer) ` +
    `and any blocklisted terms, then run the command again.`

  if (cfg.guardAction === 'warn') {
    process.stdout.write(JSON.stringify({ systemMessage: msg }))
    return
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: msg,
      },
      systemMessage: msg,
    }),
  )
}

main().catch(() => allow())
