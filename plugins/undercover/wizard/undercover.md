---
description: Show Undercover status for this repo and how to configure it
---
Run this with the execute tool and read its output:

`node __UNDERCOVER_DIR__/lib/config.mjs status`

In one or two sentences, tell me whether undercover is currently **active** for this
repo and **why** (based on the `active` and `reason` fields).

Then, only if I ask you to change it, help me edit a `.undercover.json` file at the
repo root. The available fields are:

- `mode`: `"auto"` (default), `"on"`, or `"off"`
- `stripAttribution`: block AI-assistant attribution footers (default `true`)
- `guardCommands`: enforce on `git commit` / `gh pr create|edit` (default `true`)
- `guardAction`: `"block"` (default) or `"warn"`
- `injectGuidance`: add a clean-history reminder at session start (default `true`)
- `privateRemotes`: regex patterns for trusted remotes where undercover turns OFF in auto mode
- `blocklist`: regex terms that must never appear in commit/PR text

You can also override for a single session with the `UNDERCOVER=on` / `UNDERCOVER=off`
environment variable.
