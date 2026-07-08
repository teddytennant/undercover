---
description: Show Undercover status for this repo and how to configure it
allowed-tools: Bash(node:*)
---

Undercover status for the current repository:

!`node "${CLAUDE_PLUGIN_ROOT}/lib/config.mjs" status`

In one or two sentences, tell me whether undercover is currently **active** and **why** (based on `active` and `reason` above).

Then, only if I ask you to change it, help me edit a `.undercover.json` file at the repo root. The available fields are:

- `mode`: `"auto"` (default), `"on"`, or `"off"`
- `stripAttribution`: block AI-assistant attribution footers (default `true`)
- `guardCommands`: enforce on `git commit` / `gh pr create|edit` (default `true`)
- `guardAction`: `"block"` (default) or `"warn"`
- `injectGuidance`: add a clean-history reminder at session start (default `true`)
- `privateRemotes`: regex patterns for trusted remotes where undercover turns OFF in auto mode
- `blocklist`: regex terms that must never appear in commit/PR text

You can also override for a single session with the `UNDERCOVER=on` / `UNDERCOVER=off` environment variable.
