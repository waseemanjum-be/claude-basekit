#!/usr/bin/env node
'use strict';
/*
 * Basekit session rules (SessionStart hook, on startup, clear and compact).
 *
 * 1. If the user's CLAUDE.md does not contain the Basekit house-rules block
 *    (setup.js writes it), this supplies the same rules as session context, so a
 *    plugin-only install behaves like a full one. With the block present it adds
 *    nothing: the rules are already loaded, and loading them twice would waste tokens.
 * 2. On a new session in a git repository that has no CLAUDE.md or AGENTS.md, it
 *    tells the user once that /basekit:init has not been run there. That message
 *    goes to the user, not into Claude's context.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const c = require('./lib/common');

const BLOCK_MARKER = 'basekit:start';

function userRulesInstalled() {
  const file = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'CLAUDE.md');
  try {
    return fs.readFileSync(file, 'utf8').includes(BLOCK_MARKER);
  } catch {
    return false;
  }
}

function initHint(input) {
  if (c.setting('init_hint') === 'off' || input.source !== 'startup') return '';
  const cwd = input.cwd || process.cwd();
  if (!fs.existsSync(path.join(cwd, '.git'))) return '';
  if (['CLAUDE.md', 'AGENTS.md', path.join('.claude', 'CLAUDE.md')].some((f) => fs.existsSync(path.join(cwd, f)))) return '';
  const stateFile = path.join(c.dataDir(), 'init-hints.json');
  const hinted = c.readJson(stateFile, []);
  if (hinted.includes(cwd)) return '';
  c.writeJson(stateFile, hinted.concat(cwd).slice(-200)); // hardcoded: remember the last 200 repositories
  return 'Basekit: this repository has no CLAUDE.md yet. /basekit:init records its commands, layout and conventions so Claude stops guessing them.';
}

function main() {
  const input = c.readHookInput();
  const out = {};

  if (c.setting('inject_rules') !== 'off' && !userRulesInstalled()) {
    const rules = fs.readFileSync(path.join(c.PLUGIN_ROOT, 'user-rules.md'), 'utf8').trim();
    out.hookSpecificOutput = {
      hookEventName: 'SessionStart',
      additionalContext: `The user installed the Basekit plugin, which sets these standing rules for their projects.\n\n${rules}`,
    };
  }

  const hint = initHint(input);
  if (hint) out.systemMessage = hint;

  if (Object.keys(out).length) c.emit(out);
}

try {
  main();
} catch (err) {
  process.stderr.write(`basekit session-rules error (ignored): ${err.message}\n`);
}
