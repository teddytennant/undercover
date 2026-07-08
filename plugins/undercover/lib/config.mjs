// Undercover — shared config + detection logic.
//
// Resolves configuration, decides whether undercover is active for the current
// repo, and scans text for content that should not land in a public repo.
//
// Also runnable as a small CLI:  node lib/config.mjs status

import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const DEFAULTS = {
  // 'auto'  — active unless the origin remote matches a `privateRemotes` pattern
  // 'on'    — always active
  // 'off'   — never active
  mode: 'auto',

  // Block AI-assistant attribution footers (Co-Authored-By, "Generated with …", 🤖, …).
  stripAttribution: true,

  // Enforce on `git commit` and `gh pr create|edit` commands.
  guardCommands: true,

  // 'block' — deny the command and ask for a rewrite.
  // 'warn'  — allow, but surface a warning to the model.
  guardAction: 'block',

  // Inject a short "keep history clean" reminder at session start.
  injectGuidance: true,

  // Regex patterns (matched against the origin remote URL, case-insensitive).
  // In 'auto' mode, undercover is turned OFF when the remote matches one of these
  // — i.e. these are the private/internal remotes you trust.
  privateRemotes: [],

  // Extra regex terms that must never appear in commit/PR text (codenames,
  // client names, internal URLs, etc.). Matched case-insensitively.
  blocklist: [],
}

// Built-in AI-assistant attribution patterns. Matched case-insensitively against
// the whole command string / message.
export const ATTRIBUTION_PATTERNS = [
  'co-authored-by:\\s*(claude|chatgpt|gpt|copilot|codex|cursor|gemini|devin|aider|amp)',
  'co-authored-by:[^\\n]*<[^>]*(anthropic|openai)[^>]*>',
  'generated with \\[?(claude code|cursor|codex|copilot|chatgpt|gemini)',
  'noreply@anthropic\\.com',
  '🤖',
  '\\bclaude code\\b',
]

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

export function repoRoot(cwd) {
  return git(['rev-parse', '--show-toplevel'], cwd) || null
}

export function originRemote(cwd) {
  return git(['remote', 'get-url', 'origin'], cwd) || ''
}

export function findConfigPath(cwd) {
  if (process.env.UNDERCOVER_CONFIG && existsSync(process.env.UNDERCOVER_CONFIG)) {
    return process.env.UNDERCOVER_CONFIG
  }
  const root = repoRoot(cwd)
  if (root) {
    const projectCfg = join(root, '.undercover.json')
    if (existsSync(projectCfg)) return projectCfg
  }
  const userCfg = join(homedir(), '.config', 'undercover', 'config.json')
  if (existsSync(userCfg)) return userCfg
  return null
}

export function loadConfig(cwd = process.cwd()) {
  const path = findConfigPath(cwd)
  const user = (path && readJson(path)) || {}
  return { ...DEFAULTS, ...user, _path: path }
}

function envOverride() {
  const v = (process.env.UNDERCOVER || '').trim().toLowerCase()
  if (['1', 'on', 'true', 'yes'].includes(v)) return true
  if (['0', 'off', 'false', 'no'].includes(v)) return false
  return null
}

// Decide whether undercover is active. Fail-safe default is ON: if we cannot
// positively confirm we are in a trusted private remote, we stay undercover.
export function isActive(cfg, cwd = process.cwd()) {
  const env = envOverride()
  if (env !== null) return { active: env, reason: `UNDERCOVER env = ${process.env.UNDERCOVER}` }

  if (cfg.mode === 'on') return { active: true, reason: 'mode: on' }
  if (cfg.mode === 'off') return { active: false, reason: 'mode: off' }

  const remote = originRemote(cwd)
  if (!remote) return { active: true, reason: 'auto: no origin remote (fail-safe ON)' }

  for (const pat of cfg.privateRemotes || []) {
    try {
      if (new RegExp(pat, 'i').test(remote)) {
        return { active: false, reason: `auto: origin matches private pattern /${pat}/` }
      }
    } catch {
      /* ignore invalid pattern */
    }
  }
  return { active: true, reason: `auto: origin "${remote}" not in privateRemotes` }
}

function buildPatterns(cfg) {
  const specs = []
  if (cfg.stripAttribution) {
    for (const p of ATTRIBUTION_PATTERNS) specs.push({ src: p, label: 'AI attribution' })
  }
  for (const p of cfg.blocklist || []) specs.push({ src: p, label: 'blocklisted term' })

  return specs
    .map(s => {
      try {
        return { ...s, re: new RegExp(s.src, 'i') }
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

// Return every pattern that matches `text`.
export function scan(text, cfg) {
  const hits = []
  for (const { re, src, label } of buildPatterns(cfg)) {
    const m = re.exec(text)
    if (m) hits.push({ label, pattern: src, match: m[0] })
  }
  return hits
}

function statusCli() {
  const cwd = process.cwd()
  const cfg = loadConfig(cwd)
  const { active, reason } = isActive(cfg, cwd)
  const out = {
    active,
    reason,
    configPath: cfg._path || '(none — using defaults)',
    mode: cfg.mode,
    stripAttribution: cfg.stripAttribution,
    guardCommands: cfg.guardCommands,
    guardAction: cfg.guardAction,
    injectGuidance: cfg.injectGuidance,
    privateRemotes: cfg.privateRemotes,
    blocklistTerms: (cfg.blocklist || []).length,
    origin: originRemote(cwd) || '(none)',
  }
  process.stdout.write(JSON.stringify(out, null, 2) + '\n')
}

// CLI entry point when run directly.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2]
  if (cmd === 'status') statusCli()
  else process.stdout.write('usage: node lib/config.mjs status\n')
}
