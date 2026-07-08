#!/usr/bin/env bash
# Install Undercover for Wizard: writes the two hooks into ~/.wizard/hooks.toml
# (idempotent, inside a marked block) and the /undercover command into
# ~/.wizard/commands, with the absolute plugin path resolved. Then /reload.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"      # .../plugins/undercover/wizard
PLUGIN_DIR="$(cd "$HERE/.." && pwd)"       # .../plugins/undercover
WZ="${WIZARD_HOME:-$HOME/.wizard}"
HOOKS="$WZ/hooks.toml"
START="# >>> undercover (managed) >>>"
END="# <<< undercover (managed) <<<"

mkdir -p "$WZ/commands"

# Replace any prior undercover block, then append a fresh one with paths filled in.
# Exact-match filter (markers contain '#'/'>' so a sed delimiter is unsafe here).
if [ -f "$HOOKS" ]; then
  awk -v s="$START" -v e="$END" '
    $0==s {skip=1}
    !skip {print}
    $0==e {skip=0}
  ' "$HOOKS" > "$HOOKS.tmp" && mv "$HOOKS.tmp" "$HOOKS"
fi
{
  echo "$START"
  sed "s#__UNDERCOVER_DIR__#$PLUGIN_DIR#g" "$HERE/hooks.toml" | grep -v '^#'
  echo "$END"
} >> "$HOOKS"

# The /undercover status command.
sed "s#__UNDERCOVER_DIR__#$PLUGIN_DIR#g" "$HERE/undercover.md" > "$WZ/commands/undercover.md"

echo "Installed Undercover for Wizard:"
echo "  hooks     -> $HOOKS (session_start + pre_tool_use:execute)"
echo "  command   -> $WZ/commands/undercover.md  (/undercover)"
echo "Run /reload in Wizard (or restart) to activate."
