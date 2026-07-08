#!/usr/bin/env node
// SessionStart hook: when undercover is active for this repo, add a short
// reminder so the model writes clean commit/PR text from the start. Fails open.

import { loadConfig, isActive } from '../lib/config.mjs'

const GUIDANCE = `## Undercover mode is active

You are working in a public repository. Keep the git history clean:

- Write commit messages and PR titles/bodies the way a human developer would — describe only what the change does.
- Do NOT add AI-assistant attribution: no "Generated with …", no "Co-Authored-By: <assistant>", no 🤖 footer, and no mention that an AI wrote the change.
- Do NOT leak this project's configured sensitive terms (the "blocklist" in .undercover.json) into commit messages, PR text, comments, or code.

Good examples: "Fix race condition in file watcher init", "Add support for custom key bindings", "Refactor parser for clearer error messages".`

function emit(context) {
  if (!context) {
    process.stdout.write('{}')
    return
  }
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: context,
      },
    }),
  )
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
  const cfg = loadConfig(cwd)
  if (!cfg.injectGuidance) return emit(null)
  if (!isActive(cfg, cwd).active) return emit(null)
  emit(GUIDANCE)
}

main().catch(() => emit(null))
